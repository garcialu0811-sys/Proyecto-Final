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
      return NextResponse.json({ message: 'Permisos insuficientes para ver estadisticas.' }, { status: 403 });
    }

    const allSales = await dbClient.sales.findMany();
    const allProducts = await dbClient.products.findMany();

    const sales = user.role === 'ADMIN'
      ? allSales
      : allSales.filter((s: any) => s.sellerId === user.id);

    const toDateString = (val: any): string => {
      if (!val) return '';
      const d = val instanceof Date ? val : new Date(val);
      return d.toISOString().split('T')[0];
    };

    const today = toDateString(new Date());
    const todaySales = sales.filter((s: any) => toDateString(s.createdAt) === today);
    const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + s.total, 0);

    const lowStockProducts = allProducts.filter((p: any) => p.stock <= (p.minStock || 5));
    const lowStockCount = lowStockProducts.length;
    const lowStockAlerts = lowStockProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      stock: p.stock
    }));

    const chartData = [];
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = toDateString(d);
      const dayName = weekdays[d.getDay()];

      const daySales = sales.filter((s: any) => toDateString(s.createdAt) === dateString);
      const dayRevenue = daySales.reduce((acc: number, s: any) => acc + s.total, 0);

      chartData.push({
        name: dayName,
        ventas: Number(dayRevenue.toFixed(2)),
        fecha: dateString.split('-').slice(1).reverse().join('/')
      });
    }

    const recentSales = [...sales]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        todaySalesCount: todaySales.length,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        lowStockCount,
      },
      lowStockAlerts,
      chartData,
      recentSales
    });
  } catch (error) {
    console.error('Error al generar estadisticas:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
