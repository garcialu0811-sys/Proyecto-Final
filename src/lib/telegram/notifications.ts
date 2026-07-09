import { sendMessage, getAdminChatId } from './client';
import { buildLowStockMessage, buildNewOrderMessage, buildTestMessage, LowStockData, OrderData } from './messages';
import { checkProductStock } from '@/lib/stock/monitor';

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

export async function sendNewOrderNotification(data: OrderData): Promise<boolean> {
  try {
    const chatId = await getAdminChatId();
    if (!chatId) {
      console.warn('No admin with Telegram configured for order notification');
      return false;
    }
    const message = buildNewOrderMessage(data);
    return await sendMessage(chatId, message);
  } catch (error) {
    console.error('Error sending new order notification:', error);
    return false;
  }
}

export async function notifyStockAfterUpdate(product: { id: string; name: string; stock: number; category?: string; price?: number }): Promise<void> {
  try {
    await checkProductStock(product);
  } catch (error) {
    console.error('Error in notifyStockAfterUpdate:', error);
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
