import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

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

    const sortedSales = [...mySales].sort((a: any, b: any) => {
      if (a.sellerId !== b.sellerId) return a.sellerId.localeCompare(b.sellerId);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const saleGroups: any[][] = [];
    let currentGroup: any[] = [];
    let lastSeller = '';
    let lastTime = 0;

    for (const sale of sortedSales) {
      const ts = new Date(sale.createdAt).getTime();
      if (sale.sellerId !== lastSeller || ts - lastTime > 60000) {
        if (currentGroup.length > 0) saleGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(sale);
      lastSeller = sale.sellerId;
      lastTime = ts;
    }
    if (currentGroup.length > 0) saleGroups.push(currentGroup);

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const grouped = saleGroups.map((group) => {
      const first = group[0];
      const createdAt = new Date(first.createdAt);

      if (startParam || endParam) {
        const saleDate = toDateStr(createdAt);
        if (startParam && saleDate < startParam) return null;
        if (endParam && saleDate > endParam) return null;
      }

      const items = group.map((s: any) => ({
        productName: s.productName,
        sku: '',
        quantity: s.quantity,
        price: s.price,
        subtotal: s.total,
        image: ''
      }));

      const calculatedTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

      return {
        id: first.id,
        saleIds: group.map((s: any) => s.id),
        date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guatemala' }),
        time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' }),
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
        sellerId: first.sellerId,
        clientName: '',
        clientPhone: '',
        items,
        itemCount: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        subtotal: calculatedTotal,
        discount: 0,
        total: calculatedTotal,
        paymentMethod: 'Efectivo',
        status: 'Completada'
      };
    });

    const result = grouped.filter(Boolean).sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ).map((item: any, idx: number) => ({
      ...item,
      folio: `VTA-${String(idx + 1).padStart(5, '0')}`
    }));

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

      const itemTotal = product.price * qty;

      const sale = await dbClient.sales.create({
        productId,
        productName: product.name,
        quantity: qty,
        price: product.price,
        total: itemTotal,
        sellerId: user.id
      });
      createdSales.push(sale);
    }

    return NextResponse.json({
      sale: createdSales[0],
      sales: createdSales,
      message: 'Venta registrada con exito.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
