import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; itemId: string }> }
) {
  try {
    const { sessionId, itemId } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!sessionId || !itemId) {
      return NextResponse.json(
        { error: 'sessionId y itemId son requeridos' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Cantidad invalida' },
        { status: 400 }
      );
    }

    // Find the POS session
    const posSession = await prisma!.posSession.findFirst({
      where: { sessionId, status: 'ACTIVE' },
    });

    if (!posSession) {
      return NextResponse.json(
        { error: 'Sesion no encontrada' },
        { status: 404 }
      );
    }

    // Find the item
    const item = await prisma!.posItem.findFirst({
      where: { id: itemId, sessionId: posSession.id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    if (quantity === 0) {
      // Delete item if quantity is 0
      await prisma!.posItem.delete({ where: { id: itemId } });
    } else {
      // Update quantity
      const newSubtotal = item.price * quantity;
      await prisma!.posItem.update({
        where: { id: itemId },
        data: { quantity, subtotal: newSubtotal },
      });
    }

    // Recalculate totals
    const allItems = await prisma!.posItem.findMany({
      where: { sessionId: posSession.id },
    });

    const subtotal = allItems.reduce((sum, i) => sum + i.subtotal, 0);

    await prisma!.posSession.update({
      where: { id: posSession.id },
      data: { subtotal, total: subtotal },
    });

    return NextResponse.json({
      success: true,
      totals: {
        subtotal,
        total: subtotal,
        itemCount: allItems.length,
        totalItems: allItems.reduce((sum, i) => sum + i.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Error al actualizar item' },
      { status: 500 }
    );
  }
}
