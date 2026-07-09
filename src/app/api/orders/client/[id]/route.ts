import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function GET(
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
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ message: 'Error al obtener pedido.' }, { status: 500 });
  }
}
