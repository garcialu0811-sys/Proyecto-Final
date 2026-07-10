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

    // Create a unique session ID
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
    });
  } catch (error) {
    console.error('Error creating POS session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesion POS' },
      { status: 500 }
    );
  }
}
