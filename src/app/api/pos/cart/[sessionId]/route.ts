import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    // Find the active POS session belonging to this user
    const posSession = await prisma!.posSession.findFirst({
      where: {
        sessionId,
        sellerId: user.id,
        status: 'ACTIVE',
      },
    });

    if (!posSession) {
      // Session was closed or doesn't exist — check if it was just completed by a sale
      const closedSession = await prisma!.posSession.findFirst({
        where: { sessionId, sellerId: user.id, status: 'CLOSED' },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({
        success: true,
        items: [],
        totals: { subtotal: 0, total: 0, itemCount: 0, totalItems: 0 },
        sessionClosed: true,
        saleCompletedAt: closedSession?.saleCompletedAt?.toISOString() || null,
      });
    }

    // Get all items in the cart
    const items = await prisma!.posItem.findMany({
      where: { sessionId: posSession.id },
      orderBy: { createdAt: 'asc' },
    });

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        image: item.image,
      })),
      totals: {
        subtotal: posSession.subtotal,
        total: posSession.total,
        itemCount: items.length,
        totalItems,
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Error al obtener carrito' },
      { status: 500 }
    );
  }
}
