import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;

    // Check for existing active session first
    const existingSession = await prisma!.posSession.findFirst({
      where: {
        sellerId,
        status: 'ACTIVE',
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (existingSession) {
      const totalItems = existingSession.items.reduce((sum, i) => sum + i.quantity, 0);
      return NextResponse.json({
        success: true,
        session: {
          id: existingSession.id,
          sessionId: existingSession.sessionId,
          sellerId: existingSession.sellerId,
          status: existingSession.status,
          subtotal: existingSession.subtotal,
          total: existingSession.total,
          createdAt: existingSession.createdAt,
        },
        items: existingSession.items,
        totals: {
          subtotal: existingSession.subtotal,
          total: existingSession.total,
          itemCount: existingSession.items.length,
          totalItems,
        },
        message: 'Sesion existente recuperada',
      });
    }

    // Create new session only if none exists
    const sessionId = `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const posSession = await prisma!.posSession.create({
      data: {
        sessionId,
        sellerId,
        status: 'ACTIVE',
        subtotal: 0,
        total: 0,
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: posSession.id,
        sessionId: posSession.sessionId,
        sellerId: posSession.sellerId,
        status: posSession.status,
        createdAt: posSession.createdAt,
      },
      items: [],
      totals: { subtotal: 0, total: 0, itemCount: 0, totalItems: 0 },
    });
  } catch (error) {
    console.error('Error creating POS session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesion POS' },
      { status: 500 }
    );
  }
}
