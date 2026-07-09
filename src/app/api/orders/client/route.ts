import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const user = session.user as any;
    if (user.role !== 'CLIENTE') {
      return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateRange = searchParams.get('dateRange') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let allOrders: any[] = await dbClient.orders.findMany();

    allOrders = allOrders.filter((o: any) =>
      o.clientName === user.name || o.clientPhone === user.phone
    );

    if (search) {
      const s = search.toLowerCase();
      allOrders = allOrders.filter((o: any) =>
        o.id.toLowerCase().includes(s) ||
        o.productName.toLowerCase().includes(s)
      );
    }

    if (status) {
      allOrders = allOrders.filter((o: any) => o.status === status);
    }

    if (dateRange) {
      const now = new Date();
      let days = 30;
      if (dateRange === '7d') days = 7;
      else if (dateRange === '90d') days = 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      allOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= cutoff);
    }

    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allOrders.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedOrders = allOrders.slice(start, start + limit);

    const stats = {
      total,
      pending: allOrders.filter((o: any) => o.status === 'PENDIENTE').length,
      processing: allOrders.filter((o: any) => o.status === 'PROCESANDO').length,
      inTransit: allOrders.filter((o: any) => o.status === 'EN_RUTA').length,
      delivered: allOrders.filter((o: any) => o.status === 'ENTREGADO').length,
      cancelled: allOrders.filter((o: any) => o.status === 'CANCELADO').length,
      totalSpent: allOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
    };

    return NextResponse.json({
      orders: paginatedOrders,
      stats,
      pagination: {
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener pedidos.' }, { status: 500 });
  }
}
