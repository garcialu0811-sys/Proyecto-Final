import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    // Find the active POS session
    const posSession = await prisma!.posSession.findFirst({
      where: {
        sessionId,
        status: 'ACTIVE',
      },
    });

    if (!posSession) {
      return NextResponse.json({
        success: true,
        items: [],
        totals: { subtotal: 0, total: 0, itemCount: 0, totalItems: 0 },
      });
    }

    // Get all items in the cart
    const items = await prisma!.posItem.findMany({
      where: { sessionId: posSession.id },
      orderBy: { createdAt: 'asc' },
    });

    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

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
        subtotal,
        total: subtotal,
        itemCount: items.length,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
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
