import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const admin = await (prisma as any).user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: {
        telegramChatId: true,
        notificationSettings: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const settings = admin.notificationSettings || {
      lowStockAlerts: true,
      lowStockThreshold: 5,
      newOrderAlerts: true,
      sendToTelegram: true,
      sendToEmail: false,
    };

    return NextResponse.json({
      telegramChatId: admin.telegramChatId || '',
      ...settings,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const body = await request.json();
    const { lowStockAlerts, lowStockThreshold, newOrderAlerts, sendToTelegram, sendToEmail } = body;

    const admin = await (prisma as any).user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await (prisma as any).notificationSettings.upsert({
      where: { userId: admin.id },
      create: {
        userId: admin.id,
        lowStockAlerts: lowStockAlerts ?? true,
        lowStockThreshold: lowStockThreshold ?? 5,
        newOrderAlerts: newOrderAlerts ?? true,
        sendToTelegram: sendToTelegram ?? true,
        sendToEmail: sendToEmail ?? false,
      },
      update: {
        lowStockAlerts: lowStockAlerts ?? true,
        lowStockThreshold: lowStockThreshold ?? 5,
        newOrderAlerts: newOrderAlerts ?? true,
        sendToTelegram: sendToTelegram ?? true,
        sendToEmail: sendToEmail ?? false,
      },
    });

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    return NextResponse.json({ error: 'Error saving settings' }, { status: 500 });
  }
}
