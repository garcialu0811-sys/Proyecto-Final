import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json([], { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json([]);
    }

    const notifications: any[] = [];

    // 1. Stock crítico
    const products = await dbClient.products.findMany();
    const lowStockProducts = products.filter((p: any) => p.stock <= 5);
    lowStockProducts.forEach((p: any) => {
      notifications.push({
        id: `stock-${p.id}`,
        type: 'warning',
        message: `Stock bajo en "${p.name}": solo quedan ${p.stock} unidades.`,
        createdAt: new Date().toISOString()
      });
    });

    // 2. Pedidos pendientes (solo para ADMIN)
    if (user.role === 'ADMIN') {
      const orders = await dbClient.orders.findMany();
      const pendingOrders = orders.filter((o: any) => o.status === 'PENDIENTE');
      pendingOrders.forEach((o: any) => {
        notifications.push({
          id: `order-${o.id}`,
          type: 'info',
          message: `Nuevo pedido de Q${o.total.toFixed(2)} por ${o.clientName} está pendiente.`,
          createdAt: o.createdAt || new Date().toISOString()
        });
      });
    }

    // 3. Pedidos asignados a mí como repartidor (procesando/en ruta)
    if (user.role === 'VENDEDOR') {
      const allOrders = await dbClient.orders.findMany();
      const myAssignedOrders = allOrders.filter(
        (o: any) => o.driverId === user.id && (o.status === 'PROCESANDO' || o.status === 'EN_RUTA')
      );
      myAssignedOrders.forEach((o: any) => {
        const statusLabel = o.status === 'PROCESANDO' ? 'procesando' : 'en ruta para entrega';
        notifications.push({
          id: `assigned-${o.id}`,
          type: 'success',
          message: `Tienes un pedido ${statusLabel}: ${o.productName} para ${o.clientName} (Q${o.total.toFixed(2)}).`,
          createdAt: o.updatedAt || o.createdAt || new Date().toISOString()
        });
      });
    }

    notifications.sort((a, b) => {
      if (a.type === 'warning' && b.type !== 'warning') return -1;
      if (a.type !== 'warning' && b.type === 'warning') return 1;
      return 0;
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error al generar notificaciones:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
