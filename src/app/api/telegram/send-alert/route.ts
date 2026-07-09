import { NextRequest, NextResponse } from 'next/server';
import { sendLowStockAlert } from '@/lib/telegram/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, productId, currentStock, threshold, category, price } = body;

    if (!productName || currentStock === undefined) {
      return NextResponse.json({ error: 'Missing productName or currentStock' }, { status: 400 });
    }

    const sent = await sendLowStockAlert({
      productName,
      productId: productId || 'N/A',
      currentStock,
      threshold: threshold || 5,
      category: category || 'General',
      price: price || 0,
    });

    if (sent) {
      return NextResponse.json({ success: true, message: 'Alert sent' });
    }
    return NextResponse.json({ success: false, message: 'Could not send alert' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: 'Error sending alert' }, { status: 500 });
  }
}
