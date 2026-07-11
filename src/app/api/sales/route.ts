import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import prisma from '@/lib/db/prisma';
import { checkProductStock } from '@/lib/stock/monitor';

async function generateNextFolio(): Promise<string> {
  const allSales = await dbClient.sales.findMany();
  let maxNum = 0;
  for (const s of allSales) {
    const folio = (s as any).folio;
    if (folio && folio.startsWith('VTA-')) {
      const num = parseInt(folio.replace('VTA-', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `VTA-${String(maxNum + 1).padStart(5, '0')}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const filterSellerId = searchParams.get('sellerId');

    const user = session.user as any;
    const allSales = await dbClient.sales.findMany();
    const allUsers = await dbClient.users.findMany();

    const sellerMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { sellerMap[u.id] = u; });

    let mySales = user.role === 'ADMIN'
      ? allSales
      : allSales.filter((s: any) => s.sellerId === user.id);

    if (filterSellerId && user.role === 'ADMIN') {
      mySales = mySales.filter((s: any) => s.sellerId === filterSellerId);
    }

    // Group sales by folio
    const folioMap: Record<string, any[]> = {};
    for (const s of mySales) {
      const folio = (s as any).folio || '';
      if (!folioMap[folio]) folioMap[folio] = [];
      folioMap[folio].push(s);
    }

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const result: any[] = [];
    for (const [folio, sales] of Object.entries(folioMap)) {
      const first = sales[0];
      const createdAt = new Date(first.createdAt);

      if (startParam || endParam) {
        const saleDate = toDateStr(createdAt);
        if (startParam && saleDate < startParam) continue;
        if (endParam && saleDate > endParam) continue;
      }

      const items = sales.map((s: any) => ({
        productName: s.productName,
        sku: '',
        quantity: s.quantity,
        price: s.price,
        subtotal: s.total,
        image: ''
      }));

      const totalItems = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      const calculatedTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

      result.push({
        id: first.id,
        folio,
        saleIds: sales.map((s: any) => s.id),
        date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guatemala' }),
        time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' }),
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
        sellerId: first.sellerId,
        clientName: (first as any).clientName || '',
        clientPhone: '',
        items,
        itemCount: totalItems,
        subtotal: calculatedTotal,
        discount: 0,
        total: calculatedTotal,
        paymentMethod: 'Efectivo',
        status: (first as any).saleType === 'CAMBIO' ? 'Cambio' : 'Completada',
        saleType: (first as any).saleType || 'VENTA',
        saleTypeNote: (first as any).saleTypeNote || '',
      });
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      sales: result,
      sellers: allUsers.map((u: any) => ({ id: u.id, name: u.name, role: u.role })),
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado. Por favor inicia sesion.' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes para registrar ventas.' }, { status: 403 });
    }

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [body];
    const clientName = body.clientName || '';

    if (!items.length) {
      return NextResponse.json({ message: 'Datos de venta invalidos.' }, { status: 400 });
    }

    const folio = await generateNextFolio();
    const createdSales: any[] = [];

    for (const item of items) {
      const productId = item.productId || item.id;
      const qty = Number(item.quantity) || 1;

      if (!productId || qty <= 0) continue;

      const product = await dbClient.products.findUnique(productId);
      if (!product) {
        return NextResponse.json({ message: `Producto ${productId} no encontrado.` }, { status: 404 });
      }
      if (product.stock < qty) {
        return NextResponse.json({
          message: `Stock insuficiente para ${product.name}. Disponibles: ${product.stock}, Solicitadas: ${qty}`
        }, { status: 400 });
      }

      await dbClient.products.update(productId, { stock: product.stock - qty });

      const newStock = product.stock - qty;
      checkProductStock({
        id: product.id,
        name: product.name,
        stock: newStock,
        category: product.category,
        price: product.price,
      }).catch(() => {});

      const itemTotal = product.price * qty;

      const sale = await dbClient.sales.create({
        folio,
        productId,
        productName: product.name,
        quantity: qty,
        price: product.price,
        total: itemTotal,
        sellerId: user.id,
        clientName: clientName || undefined,
      });
      createdSales.push(sale);
    }

    // Close the active POS session for this seller so other devices can detect the sale
    try {
      const now = new Date();
      await prisma!.posSession.updateMany({
        where: { sellerId: user.id, status: 'ACTIVE' },
        data: { status: 'CLOSED', saleCompletedAt: now },
      });
    } catch (e) {
      // Non-critical: session close failure shouldn't block the sale
    }

    return NextResponse.json({
      sale: createdSales[0],
      sales: createdSales,
      folio,
      message: 'Venta registrada con exito.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
