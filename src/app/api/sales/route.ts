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

    const user = session.user as any;
    const allSales = await dbClient.sales.findMany();
    const allOrders = await dbClient.orders.findMany();
    const allUsers = await dbClient.users.findMany();

    const sellerMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { sellerMap[u.id] = u; });

    const relevantOrders = user.role === 'ADMIN'
      ? allOrders
      : allOrders.filter((o: any) => o.driverId === user.id);

    // Filter by date range if provided
    const filteredOrders = relevantOrders.filter((o: any) => {
      if (!startParam && !endParam) return true;
      const orderDate = new Date(o.createdAt);
      const orderDateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      if (startParam && orderDateStr < startParam) return false;
      if (endParam && orderDateStr > endParam) return false;
      return true;
    });

    // Group by Order — each Order represents one transaction
    const grouped = filteredOrders
      .filter((o: any) => o.status === 'COMPLETADA' || o.status === 'PENDIENTE')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((order: any, idx: number) => {
        const orderTime = new Date(order.createdAt);

        // Find Sale records that belong to this Order (same seller, within 30s window)
        const matchedSales = allSales.filter((s: any) => {
          const sTime = new Date(s.createdAt).getTime();
          return s.sellerId === order.driverId &&
            sTime >= orderTime.getTime() - 2000 &&
            sTime <= orderTime.getTime() + 30000;
        });

        // If no matched sales, build items from order data itself
        const items = matchedSales.length > 0
          ? matchedSales.map((s: any) => ({
              productName: s.productName,
              sku: '',
              quantity: s.quantity,
              price: s.price,
              subtotal: s.total,
              image: ''
            }))
          : [{
              productName: order.productName,
              sku: '',
              quantity: order.quantity,
              price: order.price,
              total: order.total,
              subtotal: order.total,
              image: ''
            }];

        const calculatedTotal = items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
        const discount = Number(order.discount) || 0;

        return {
          id: order.id,
          folio: `VTA-${String(idx + 1).padStart(5, '0')}`,
          date: orderTime.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: orderTime.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
          createdAt: orderTime.toISOString(),
          sellerName: sellerMap[order.driverId]?.name || 'Vendedor',
          sellerId: order.driverId || '',
          clientName: order.clientName || '',
          clientPhone: order.clientPhone || '',
          items,
          subtotal: calculatedTotal,
          discount,
          total: calculatedTotal - discount,
          paymentMethod: order.paymentMethod || 'Efectivo',
          status: order.status === 'COMPLETADA' ? 'Completada' : order.status
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
