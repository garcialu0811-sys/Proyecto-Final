import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const order = await dbClient.orders.findUnique(id);
    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes para editar pedidos.' }, { status: 403 });
    }

    const body = await request.json();
    const { status, driverId, driverName, clientName, clientPhone, clientAddress } = body;
    const order = await dbClient.orders.findUnique(id);

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (driverId !== undefined) updateData.driverId = driverId;
    if (driverName !== undefined) updateData.driverName = driverName;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (clientAddress !== undefined) updateData.clientAddress = clientAddress;

    const updated = await dbClient.orders.update(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json({ message: 'Error interno al actualizar pedido.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Solo administradores pueden eliminar pedidos.' }, { status: 403 });
    }

    const order = await dbClient.orders.findUnique(id);
    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }

    await dbClient.orders.delete(id);
    return NextResponse.json({ message: 'Pedido eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    return NextResponse.json({ message: 'Error interno al eliminar pedido.' }, { status: 500 });
  }
}
