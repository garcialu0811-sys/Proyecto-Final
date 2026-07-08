import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/dbClient';

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QR-${datePart}-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestInfo, items, subtotal, shipping, total, paymentMethod, shippingAddress } = body;

    if (!guestInfo || !guestInfo.name || !guestInfo.email) {
      return NextResponse.json({ message: 'Nombre y correo electronico son requeridos.' }, { status: 400 });
    }

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
      clientName: guestInfo.name,
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
    console.error('Error al crear pedido de invitado:', error);
    return NextResponse.json({ message: 'Error interno del servidor al crear pedido.' }, { status: 500 });
  }
}
