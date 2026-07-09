import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, setWebhook } from '@/lib/telegram/client';
import { buildWelcomeMessage } from '@/lib/telegram/messages';
import { dbClient } from '@/lib/db/dbClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = body;
    const chatId = String(message.chat.id);
    const text = message.text || '';

    console.log(`Telegram webhook received: text="${text}", chatId=${chatId}`);

    if (text === '/start' || text === '/help') {
      const existingAdmin = await dbClient.users.findFirst({
        where: { role: 'ADMIN', telegramChatId: chatId },
      });

      console.log('Existing admin with this chatId:', existingAdmin?.id || 'none');

      if (!existingAdmin) {
        const adminWithoutTelegram = await dbClient.users.findFirst({
          where: { role: 'ADMIN', telegramChatId: null, isActive: true },
        });

        console.log('Admin without Telegram found:', adminWithoutTelegram?.id || 'none');

        if (adminWithoutTelegram) {
          await dbClient.users.update(adminWithoutTelegram.id, { telegramChatId: chatId });
          console.log(`Linked chatId ${chatId} to admin ${adminWithoutTelegram.id}`);
          await sendMessage(chatId, buildWelcomeMessage(chatId));
        } else {
          await sendMessage(chatId, 'No se encontro administrador para vincular. Contacta al soporte.');
        }
      } else {
        await sendMessage(chatId, buildWelcomeMessage(chatId));
      }
    }

    if (text === '/status') {
      await sendMessage(chatId, [
        '*Estado del Sistema*',
        '',
        `*Chat ID:* ${chatId}`,
        '',
        'Sistema funcionando correctamente.',
      ].join('\n'));
    }

    if (text === '/test') {
      await sendMessage(chatId, [
        '*Prueba de notificacion*',
        '',
        'El sistema de notificaciones esta funcionando correctamente.',
        `*Chat ID:* ${chatId}`,
      ].join('\n'));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'TELEGRAM_WEBHOOK_URL not configured' }, { status: 500 });
    }
    const result = await setWebhook(webhookUrl);
    return NextResponse.json({ success: result, webhookUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Error setting webhook' }, { status: 500 });
  }
}
