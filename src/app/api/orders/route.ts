import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import { sendNewOrderNotification } from '@/lib/telegram/notifications';
import { checkProductStock } from '@/lib/stock/monitor';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateRange = searchParams.get('dateRange') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let allOrders: any[] = await dbClient.orders.findMany();

    if (search) {
      const s = search.toLowerCase();
      allOrders = allOrders.filter((o: any) =>
        o.id.toLowerCase().includes(s) ||
        o.clientName.toLowerCase().includes(s) ||
        o.productName.toLowerCase().includes(s)
      );
    }
    if (status) {
      allOrders = allOrders.filter((o: any) => o.status === status);
    }
    if (dateRange) {
      const now = new Date();
      let cutoff: Date | null = null;
      if (dateRange === '7d') cutoff = new Date(now.getTime() - 7 * 86400000);
      else if (dateRange === '30d') cutoff = new Date(now.getTime() - 30 * 86400000);
      else if (dateRange === '90d') cutoff = new Date(now.getTime() - 90 * 86400000);
      if (cutoff) allOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= cutoff);
    }

    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allOrders.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = allOrders.slice(start, start + limit);

    const stats = {
      total: allOrders.length,
      pending: allOrders.filter((o: any) => o.status === 'PENDIENTE').length,
      processing: allOrders.filter((o: any) => o.status === 'PROCESANDO').length,
      inTransit: allOrders.filter((o: any) => o.status === 'EN_RUTA').length,
      delivered: allOrders.filter((o: any) => o.status === 'ENTREGADO').length,
      cancelled: allOrders.filter((o: any) => o.status === 'CANCELADO').length,
      totalRevenue: allOrders.filter((o: any) => o.status === 'ENTREGADO').reduce((sum: number, o: any) => sum + (o.total || 0), 0),
      avgOrder: allOrders.length > 0 ? allOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0) / allOrders.length : 0,
    };

    return NextResponse.json({
      orders: paginated,
      stats,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { items, subtotal, shipping, total, shippingAddress, clientName, clientPhone } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'El pedido debe contener al menos un producto.' }, { status: 400 });
    }

    const now = new Date();
    const orderNumber = `PED-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await dbClient.orders.create({
      orderNumber,
      productId: items[0].productId,
      productName: items.map((i: any) => i.productName).join(', '),
      quantity: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      price: subtotal || 0,
      total: total || 0,
      status: 'PENDIENTE',
      clientName: clientName || (session.user as any).name,
      clientPhone: clientPhone || '',
      clientAddress: shippingAddress || '',
    });

    for (const item of items) {
      const product = await dbClient.products.findUnique(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await dbClient.products.update(item.productId, { stock: newStock });
        checkProductStock({
          id: product.id,
          name: product.name,
          stock: newStock,
          category: product.category,
          price: product.price,
        }).catch(() => {});
      }
    }

    sendNewOrderNotification({
      orderNumber,
      clientName: clientName || (session.user as any).name,
      total: total || 0,
      items: items.map((i: any) => `${i.productName} x${i.quantity}`).join(', '),
      createdAt: new Date().toLocaleString('es-GT'),
    }).catch(() => {});

    return NextResponse.json({ order, message: 'Pedido creado exitosamente.' }, { status: 201 });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json({ message: 'Error interno al crear pedido.' }, { status: 500 });
  }
}
