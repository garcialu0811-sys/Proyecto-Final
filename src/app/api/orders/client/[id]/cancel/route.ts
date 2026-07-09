import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'CLIENTE') return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });

    if (!prisma) return NextResponse.json({ message: 'Error de base de datos.' }, { status: 500 });

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { clientName: user.name },
        ],
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }

    if (order.status !== 'PENDIENTE' && order.status !== 'PROCESANDO') {
      return NextResponse.json({ message: 'Solo se pueden cancelar pedidos pendientes o en proceso.' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELADO' },
      include: {
        items: true,
        history: true,
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: id,
        status: 'CANCELADO',
        note: 'Cancelado por el cliente',
      },
    });

    return NextResponse.json({ order: updatedOrder, message: 'Pedido cancelado exitosamente.' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ message: 'Error al cancelar pedido.' }, { status: 500 });
  }
}
