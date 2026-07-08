import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QR-${datePart}-${randomPart}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const user = session.user as any;
    const allOrders = await dbClient.orders.findMany();
    const orders = user.role === 'ADMIN'
      ? allOrders
      : allOrders.filter((o: any) => o.clientName === user.name || o.driverId === user.id);
    return NextResponse.json(orders);
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
    const { userId, items, subtotal, shipping, total, paymentMethod, shippingAddress, clientName } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'El pedido debe contener al menos un producto.' }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();

    const order = await dbClient.orders.create({
      productId: items[0].productId,
      productName: items.map((i: any) => i.productName).join(', '),
      quantity: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      price: subtotal,
      total: total,
      status: 'PENDIENTE',
      clientName: clientName || (session.user as any).name,
      clientAddress: shippingAddress || '',
    });

    for (const item of items) {
      const product = await dbClient.products.findUnique(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await dbClient.products.update(item.productId, { stock: newStock });
      }
    }

    return NextResponse.json({
      id: order.id,
      orderNumber,
      message: 'Pedido creado exitosamente.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json({ message: 'Error interno del servidor al crear pedido.' }, { status: 500 });
  }
}
