import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const user = session.user as any;
    const allSales = await dbClient.sales.findMany();
    const allOrders = await dbClient.orders.findMany();
    const allUsers = await dbClient.users.findMany();

    const sales = user.role === 'ADMIN'
      ? allSales
      : allSales.filter((s: any) => s.sellerId === user.id);

    const sellerMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { sellerMap[u.id] = u; });

    // Group individual sale records by sellerId + time window (5s) to reconstruct transactions
    const sorted = [...sales].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const groups: any[][] = [];
    let currentGroup: any[] = [];
    let lastKey = '';

    for (const sale of sorted) {
      const ts = new Date(sale.createdAt).getTime();
      const key = `${sale.sellerId}-${Math.floor(ts / 5000)}`;
      if (key !== lastKey && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(sale);
      lastKey = key;
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // For each group, find matching order for client info
    const grouped = groups.map((group, idx) => {
      const first = group[0];
      const last = group[group.length - 1];
      const createdAt = new Date(first.createdAt);

      // Find the most recent order from this seller within 10s window
      const matchingOrder: any = allOrders
        .filter((o: any) => {
          const oTime = new Date(o.createdAt).getTime();
          return o.driverId === first.sellerId &&
            oTime >= new Date(first.createdAt).getTime() - 2000 &&
            oTime <= new Date(last.createdAt).getTime() + 10000;
        })
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

      const items = group.map((s: any) => ({
        productName: s.productName,
        sku: '',
        quantity: s.quantity,
        price: s.price,
        subtotal: s.total,
        image: ''
      }));

      const total = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

      return {
        id: first.id,
        folio: `VTA-${String(idx + 1).padStart(5, '0')}`,
        date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
        sellerId: first.sellerId,
        clientName: matchingOrder?.clientName || '',
        clientPhone: matchingOrder?.clientPhone || '',
        items,
        subtotal: total,
        discount: matchingOrder?.discount || 0,
        total: total - (matchingOrder?.discount || 0),
        paymentMethod: matchingOrder?.paymentMethod || 'Efectivo',
        status: 'Completada'
      };
    });

    return NextResponse.json(grouped);
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
    const clientPhone = body.clientPhone || '';
    const clientAddress = body.clientAddress || '';
    const discount = Number(body.discount) || 0;

    if (!items.length) {
      return NextResponse.json({ message: 'Datos de venta invalidos.' }, { status: 400 });
    }

    const createdSales: any[] = [];
    let orderTotal = 0;

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
      orderTotal += itemTotal;

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

    // Create a single Order with items relation
    const now = new Date();
    const orderNumber = `VT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await dbClient.orders.create({
      orderNumber,
      productId: createdSales[0]?.productId || '',
      productName: createdSales.map((s: any) => s.productName).join(', '),
      quantity: createdSales.reduce((sum: number, s: any) => sum + s.quantity, 0),
      price: orderTotal,
      total: orderTotal - discount,
      status: 'COMPLETADA',
      clientName: clientName || 'Venta Rapida / Mostrador',
      clientPhone,
      clientAddress,
      discount,
      paymentMethod: 'Efectivo',
      driverId: user.role === 'VENDEDOR' ? user.id : undefined,
      driverName: user.role === 'VENDEDOR' ? user.name : undefined
    });

    return NextResponse.json({
      sale: createdSales[0],
      order,
      sales: createdSales,
      message: 'Venta registrada con exito.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return NextResponse.json({ message: 'Error interno al registrar venta.' }, { status: 500 });
  }
}
