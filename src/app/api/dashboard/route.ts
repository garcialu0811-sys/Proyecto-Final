import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes para ver estadísticas.' }, { status: 403 });
    }

    // Obtener todos los datos crudos
    const allSales = await dbClient.sales.findMany();
    const allOrders = await dbClient.orders.findMany();
    const allProducts = await dbClient.products.findMany();

    // Filtrar ventas por rol
    const sales = user.role === 'ADMIN' 
      ? allSales 
      : allSales.filter((s: any) => s.sellerId === user.id);

    // Filtrar pedidos por rol
    const orders = user.role === 'ADMIN'
      ? allOrders
      : allOrders.filter((o: any) => o.driverId === user.id);

    // Helper to safely get date string from potentially Date or string
    const toDateString = (val: any): string => {
      if (!val) return '';
      const d = val instanceof Date ? val : new Date(val);
      return d.toISOString().split('T')[0];
    };

    // 1. Calcular estadísticas de hoy
    const today = toDateString(new Date());
    const todaySales = sales.filter((s: any) => toDateString(s.createdAt) === today);
    const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + s.total, 0);

    // Alertas de stock bajo
    const lowStockProducts = allProducts.filter((p: any) => p.stock <= (p.minStock || 5));
    const lowStockCount = lowStockProducts.length;
    const lowStockAlerts = lowStockProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      stock: p.stock
    }));

    // Estados de envío
    const ordersInRoute = orders.filter((o: any) => o.status === 'EN_RUTA').length;
    const pendingOrders = orders.filter((o: any) => o.status === 'PENDIENTE' || o.status === 'PROCESANDO').length;

    // 2. Gráfico semanal (últimos 7 días)
    const chartData = [];
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = toDateString(d);
      const dayName = weekdays[d.getDay()];

      const daySales = sales.filter((s: any) => toDateString(s.createdAt) === dateString);
      const dayRevenue = daySales.reduce((acc: number, s: any) => acc + s.total, 0);
      const dayOrders = orders.filter((o: any) => toDateString(o.createdAt) === dateString).length;

      chartData.push({
        name: dayName,
        ventas: Number(dayRevenue.toFixed(2)),
        pedidos: dayOrders,
        fecha: dateString.split('-').slice(1).reverse().join('/')
      });
    }

    // 3. Ventas recientes (últimas 5)
    const recentSales = [...sales]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        todaySalesCount: todaySales.length,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        lowStockCount,
        ordersInRoute,
        pendingOrders,
      },
      lowStockAlerts,
      chartData,
      recentSales
    });
  } catch (error) {
    console.error('Error al generar estadísticas:', error);
    return NextResponse.json({ message: 'Error interno del servidor al procesar estadísticas.' }, { status: 500 });
  }
}
