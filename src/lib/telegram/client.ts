import axios from 'axios';
import { dbClient } from '@/lib/db/dbClient';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  return token;
}

export async function sendMessage(chatId: string, text: string, parseMode: string = 'Markdown'): Promise<boolean> {
  try {
    const token = getToken();
    await axios.post(`${TELEGRAM_API}${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
    return true;
  } catch (error: any) {
    console.error('Telegram sendMessage error:', error.response?.data || error.message);
    return false;
  }
}

export async function getBotInfo(): Promise<any> {
  try {
    const token = getToken();
    const res = await axios.get(`${TELEGRAM_API}${token}/getMe`);
    return res.data.result;
  } catch (error: any) {
    console.error('Telegram getBotInfo error:', error.response?.data || error.message);
    return null;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  try {
    const token = getToken();
    await axios.post(`${TELEGRAM_API}${token}/setWebhook`, { url });
    return true;
  } catch (error: any) {
    console.error('Telegram setWebhook error:', error.response?.data || error.message);
    return false;
  }
}

export async function getAdminChatId(): Promise<string | null> {
  try {
    const admin = await dbClient.users.findFirst({
      where: {
        role: 'ADMIN',
        telegramChatId: { not: null },
        isActive: true,
      },
      select: { telegramChatId: true },
    });
    return (admin as any)?.telegramChatId || null;
  } catch (error) {
    console.error('Error getting admin chat ID:', error);
    return null;
  }
}

export async function getAdminNotificationSettings(): Promise<any> {
  try {
    const admin = await dbClient.users.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { telegramChatId: true, notificationSettings: true },
    });
    return admin;
  } catch (error) {
    console.error('Error getting admin notification settings:', error);
    return null;
  }
}
