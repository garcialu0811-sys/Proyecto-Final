import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import { checkProductStock } from '@/lib/stock/monitor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role === 'CLIENTE') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, type, quantity, reason, reference } = body;

    if (!productId || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ message: 'Faltan campos requeridos.' }, { status: 400 });
    }

    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      return NextResponse.json({ message: 'Tipo de movimiento invalido.' }, { status: 400 });
    }

    const product = await dbClient.products.findUnique(productId);
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    switch (type) {
      case 'IN':
        newStock = previousStock + Number(quantity);
        break;
      case 'OUT':
        if (Number(quantity) > previousStock) {
          return NextResponse.json({ message: 'Stock insuficiente.' }, { status: 400 });
        }
        newStock = previousStock - Number(quantity);
        break;
      case 'ADJUSTMENT':
        newStock = Number(quantity);
        break;
    }

    await dbClient.products.update(productId, { stock: newStock });

    if (type === 'OUT' || type === 'ADJUSTMENT') {
      checkProductStock({
        id: product.id,
        name: product.name,
        stock: newStock,
        category: product.category,
        price: product.price,
      }).catch(() => {});
    }

    const userName = (session.user as any).name || 'Usuario';

    return NextResponse.json({
      productId,
      productName: product.name,
      sku: product.sku,
      type,
      quantity: Number(quantity),
      previousStock,
      newStock,
      reason: reason || (type === 'IN' ? 'Entrada de stock' : type === 'OUT' ? 'Salida de stock' : 'Ajuste de inventario'),
      reference: reference || '',
      userName,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    return NextResponse.json({ message: 'Error al registrar movimiento.' }, { status: 500 });
  }
}
