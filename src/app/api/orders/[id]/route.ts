import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

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

    const { status, driverId, driverName } = await request.json();
    const order = await dbClient.orders.findUnique(id);

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (driverId !== undefined) updateData.driverId = driverId;
    if (driverName !== undefined) updateData.driverName = driverName;

    const updated = await dbClient.orders.update(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json({ message: 'Error interno al actualizar pedido.' }, { status: 500 });
  }
}
