import { sendLowStockAlert } from '@/lib/telegram/notifications';
import prisma from '@/lib/db/prisma';

export async function checkProductStock(product: {
  id: string;
  name: string;
  stock: number;
  category?: string;
  price?: number;
}): Promise<void> {
  try {
    if (!prisma) return;

    const admin = await (prisma as any).user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { notificationSettings: true },
    });

    const settings = admin?.notificationSettings;
    if (!settings || !settings.lowStockAlerts || !settings.sendToTelegram) return;

    const threshold = settings.lowStockThreshold || 5;

    if (product.stock <= threshold) {
      await sendLowStockAlert({
        productName: product.name,
        productId: product.id,
        currentStock: product.stock,
        threshold,
        category: product.category || 'General',
        price: product.price || 0,
      });
    }
  } catch (error) {
    console.error('Error checking product stock:', error);
  }
}
