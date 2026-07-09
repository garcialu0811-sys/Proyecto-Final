export interface LowStockData {
  productName: string;
  productId: string;
  currentStock: number;
  threshold: number;
  category: string;
  price: number;
}

export interface OrderData {
  orderNumber: string;
  clientName: string;
  total: number;
  items: string;
  createdAt: string;
}

export function buildLowStockMessage(data: LowStockData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qrshop-chi.vercel.app';
  return [
    '*ALERTA - STOCK BAJO*',
    '',
    `*Producto:* ${data.productName}`,
    `*Categoria:* ${data.category}`,
    `*Precio:* Q${data.price.toFixed(2)}`,
    '',
    `*Stock actual:* ${data.currentStock} unidades`,
    `*Umbral minimo:* ${data.threshold} unidades`,
    '',
    '*Accion requerida:* Reponer inventario',
    '',
    `[Ver producto](${appUrl}/products)`,
  ].join('\n');
}

export function buildNewOrderMessage(data: OrderData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qrshop-chi.vercel.app';
  return [
    '*NUEVO PEDIDO*',
    '',
    `*Pedido:* ${data.orderNumber}`,
    `*Cliente:* ${data.clientName}`,
    `*Fecha:* ${data.createdAt}`,
    '',
    `*Productos:* ${data.items}`,
    `*Total:* Q${data.total.toFixed(2)}`,
    '',
    `[Ver pedidos](${appUrl}/orders/admin)`,
  ].join('\n');
}

export function buildTestMessage(chatId: string): string {
  return [
    '*Conexion exitosa con Variedades Coatán*',
    '',
    `*Chat ID:* ${chatId}`,
    '*Estado:* Notificaciones activas',
    '',
    'Recibiras alertas de stock bajo y nuevos pedidos.',
  ].join('\n');
}

export function buildWelcomeMessage(chatId: string): string {
  return [
    '*Bienvenido a Variedades Coatán Notificaciones*',
    '',
    '*Alertas configuradas:*',
    '- Stock bajo de productos',
    '- Nuevos pedidos',
    '',
    `*Tu Chat ID:* ${chatId}`,
    '',
    'Las notificaciones se enviaran automaticamente.',
  ].join('\n');
}
