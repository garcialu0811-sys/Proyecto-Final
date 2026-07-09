import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/telegram/notifications';
import { getBotInfo } from '@/lib/telegram/client';

export async function GET() {
  try {
    const botInfo = await getBotInfo();
    if (!botInfo) {
      return NextResponse.json({ success: false, error: 'Could not connect to Telegram bot' }, { status: 500 });
    }

    const result = await sendTestNotification();
    return NextResponse.json({
      ...result,
      bot: { username: botInfo.username, first_name: botInfo.first_name },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error testing connection' }, { status: 500 });
  }
}
