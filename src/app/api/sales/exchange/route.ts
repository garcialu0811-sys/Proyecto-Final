import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { originalFolio, oldProductId, oldProductName, oldProductPrice, newProductId, newProductName, newProductPrice, difference } = body;

    if (!oldProductId || !newProductId) {
      return NextResponse.json({ error: 'Faltan datos del producto' }, { status: 400 });
    }

    // 1. Get the new product to verify it exists and has stock
    const newProduct = await prisma!.product.findUnique({ where: { id: newProductId } });
    if (!newProduct) {
      return NextResponse.json({ error: 'Producto nuevo no encontrado' }, { status: 404 });
    }
    if (!newProduct.isActive) {
      return NextResponse.json({ error: 'Producto nuevo inactivo' }, { status: 400 });
    }
    if (newProduct.stock <= 0) {
      return NextResponse.json({ error: 'Producto nuevo sin stock disponible' }, { status: 400 });
    }

    // 2. Increase stock of returned product by 1
    await prisma!.product.update({
      where: { id: oldProductId },
      data: { stock: { increment: 1 } },
    });

    // 3. Decrease stock of new product by 1
    await prisma!.product.update({
      where: { id: newProductId },
      data: { stock: { decrement: 1 } },
    });

    // 4. Generate folio for the exchange
    const allSales = await prisma!.sale.findMany({ select: { folio: true } });
    let maxNum = 0;
    for (const s of allSales) {
      if (s.folio && s.folio.startsWith('VTA-')) {
        const num = parseInt(s.folio.replace('VTA-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const folio = `VTA-${String(maxNum + 1).padStart(5, '0')}`;

    // 5. Create the exchange sale record (only if there's a difference to pay)
    const totalToPay = Math.max(0, difference);
    let sale = null;
    if (totalToPay > 0) {
      sale = await prisma!.sale.create({
        data: {
          folio,
          productId: newProductId,
          productName: newProductName,
          quantity: 1,
          price: newProductPrice,
          total: totalToPay,
          sellerId: user.id,
          saleType: 'CAMBIO',
          saleTypeNote: `Cambio de ${oldProductName} por ${newProductName}`,
        },
      });
    } else {
      // Same price exchange - record with 0 total
      sale = await prisma!.sale.create({
        data: {
          folio,
          productId: newProductId,
          productName: newProductName,
          quantity: 1,
          price: newProductPrice,
          total: 0,
          sellerId: user.id,
          saleType: 'CAMBIO',
          saleTypeNote: `Cambio de ${oldProductName} por ${newProductName}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: totalToPay > 0
        ? `Cambio registrado. Diferencia a pagar: Q${totalToPay.toFixed(2)}`
        : 'Cambio registrado (mismo valor)',
      sale,
      folio: sale.folio,
      difference: totalToPay,
      oldProduct: { id: oldProductId, name: oldProductName },
      newProduct: { id: newProductId, name: newProductName },
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering exchange:', error);
    return NextResponse.json({ error: 'Error al procesar el cambio' }, { status: 500 });
  }
}
