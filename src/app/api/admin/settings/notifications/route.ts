import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await dbClient.users.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    let settings: any = null;
    if (prisma) {
      try {
        settings = await (prisma as any).notificationSettings.findUnique({
          where: { userId: admin.id },
        });
      } catch {
        // ignore
      }
    }

    if (!settings) {
      settings = {
        lowStockAlerts: true,
        lowStockThreshold: 5,
        newOrderAlerts: true,
        sendToTelegram: true,
        sendToEmail: false,
      };
    }

    return NextResponse.json({
      telegramChatId: (admin as any).telegramChatId || '',
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

    const body = await request.json();
    const { lowStockAlerts, lowStockThreshold, newOrderAlerts, sendToTelegram, sendToEmail } = body;

    const admin = await dbClient.users.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
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
