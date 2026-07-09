import { sendMessage, getAdminChatId } from './client';
import { buildLowStockMessage, buildTestMessage, LowStockData } from './messages';

export async function sendLowStockAlert(data: LowStockData): Promise<boolean> {
  try {
    const chatId = await getAdminChatId();
    if (!chatId) {
      console.warn('No admin with Telegram configured');
      return false;
    }
    const message = buildLowStockMessage(data);
    return await sendMessage(chatId, message);
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return false;
  }
}

export async function sendTestNotification(): Promise<{ success: boolean; chatId?: string; error?: string }> {
  try {
    const chatId = await getAdminChatId();
    if (!chatId) {
      return { success: false, error: 'No admin with Telegram configured' };
    }
    const message = buildTestMessage(chatId);
    const sent = await sendMessage(chatId, message);
    if (sent) {
      return { success: true, chatId };
    }
    return { success: false, error: 'Failed to send message' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
