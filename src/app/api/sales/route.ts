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
    const allOrders = await dbClient.orders.findMany();
    const allUsers = await dbClient.users.findMany();

    const sellerMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { sellerMap[u.id] = u; });

    // Filter sales by user role
    let mySales = user.role === 'ADMIN'
      ? allSales
      : allSales.filter((s: any) => s.sellerId === user.id);

    // Filter by specific seller if requested (admin only)
    if (filterSellerId && user.role === 'ADMIN') {
      mySales = mySales.filter((s: any) => s.sellerId === filterSellerId);
    }

    // Filter orders by user role
    let myOrders = user.role === 'ADMIN'
      ? allOrders
      : allOrders.filter((o: any) => o.driverId === user.id);

    // Filter orders by specific seller if requested (admin only)
    if (filterSellerId && user.role === 'ADMIN') {
      myOrders = myOrders.filter((o: any) => o.driverId === filterSellerId);
    }

    // Group Sales by sellerId + time proximity (60s window)
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

    // Build a Set of used sale IDs to find orphan orders later
    const usedSaleIds = new Set<string>();

    // For each sale group, find matching Order
    const grouped = saleGroups.map((group) => {
      const first = group[0];
      const last = group[group.length - 1];
      const firstTime = new Date(first.createdAt).getTime();
      const lastTime = new Date(last.createdAt).getTime();

      group.forEach((s: any) => usedSaleIds.add(s.id));

      // Find Order: same seller, created after the first sale, within 60s of last sale
      const matchingOrder: any = myOrders
        .filter((o: any) => {
          const oTime = new Date(o.createdAt).getTime();
          return o.driverId === first.sellerId &&
            oTime >= firstTime - 2000 &&
            oTime <= lastTime + 60000;
        })
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] || null;

      const items = group.map((s: any) => ({
        productName: s.productName,
        sku: '',
        quantity: s.quantity,
        price: s.price,
        subtotal: s.total,
        image: ''
      }));

      const calculatedTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
      const discount = matchingOrder ? (Number(matchingOrder.discount) || 0) : 0;
      const createdAt = new Date(first.createdAt);

      // Apply date filter
      if (startParam || endParam) {
        const dateStr = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
        if (startParam && dateStr < startParam) return null;
        if (endParam && dateStr > endParam) return null;
      }

      return {
        id: first.id,
        saleIds: group.map((s: any) => s.id),
        date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
        sellerId: first.sellerId,
        clientName: matchingOrder?.clientName || '',
        clientPhone: matchingOrder?.clientPhone || '',
        items,
        itemCount: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        subtotal: calculatedTotal,
        discount,
        total: calculatedTotal - discount,
        paymentMethod: matchingOrder?.paymentMethod || 'Efectivo',
        status: matchingOrder?.status === 'COMPLETADA' ? 'Completada' : 'Completada'
      };
    });

    // Also add orphan Orders ( Orders without matching Sales, e.g. old single-item POSTs )
    const orphanOrders = myOrders.filter((o: any) => {
      if (o.status !== 'COMPLETADA' && o.status !== 'PENDIENTE') return false;
      return !saleGroups.some((group) => {
        const first = group[0];
        const last = group[group.length - 1];
        const firstTime = new Date(first.createdAt).getTime();
        const lastTime = new Date(last.createdAt).getTime();
        const oTime = new Date(o.createdAt).getTime();
        return o.driverId === first.sellerId &&
          oTime >= firstTime - 2000 &&
          oTime <= lastTime + 60000;
      });
    });

    for (const order of orphanOrders) {
      const o: any = order;
      const createdAt = new Date(o.createdAt);

      if (startParam || endParam) {
        const dateStr = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
        if (startParam && dateStr < startParam) continue;
        if (endParam && dateStr > endParam) continue;
      }

      grouped.push({
        id: o.id,
        saleIds: [],
        date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[(o.driverId || '') as string]?.name || 'Vendedor',
        sellerId: o.driverId || '',
        clientName: o.clientName || '',
        clientPhone: o.clientPhone || '',
        items: [{
          productName: o.productName,
          sku: '',
          quantity: o.quantity,
          price: o.price,
          subtotal: o.total,
          image: ''
        }],
        itemCount: o.quantity,
        subtotal: o.total,
        discount: Number(o.discount) || 0,
        total: o.total - (Number(o.discount) || 0),
        paymentMethod: o.paymentMethod || 'Efectivo',
        status: o.status === 'COMPLETADA' ? 'Completada' : 'Completada'
      });
    }

    // Sort by date ASCENDING for chronological folio numbers
    grouped.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Add folio numbers (VTA-00001 = oldest, highest = newest)
    const result = grouped.filter(Boolean).map((item: any, idx: number) => ({
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

    // Create a single Order
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
