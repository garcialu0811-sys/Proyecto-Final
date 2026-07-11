import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folio: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const { folio } = await params;
    const allSales = await dbClient.sales.findMany();
    const allUsers = await dbClient.users.findMany();

    const sellerMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { sellerMap[u.id] = u; });

    const sortedSales = [...allSales].sort((a: any, b: any) => {
      if (a.sellerId !== b.sellerId) return a.sellerId.localeCompare(b.sellerId);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const saleGroups: any[][] = [];
    let currentGroup: any[] = [];
    let lastSeller = '';
    let lastTime = 0;

    for (const sale of sortedSales) {
      const ts = new Date(sale.createdAt).getTime();
      if (sale.sellerId !== lastSeller || ts - lastTime > 60000) {
        if (currentGroup.length > 0) saleGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(sale);
      lastSeller = sale.sellerId;
      lastTime = ts;
    }
    if (currentGroup.length > 0) saleGroups.push(currentGroup);

    const grouped = saleGroups.map((group) => {
      const first = group[0];
      const createdAt = new Date(first.createdAt);
      const items = group.map((s: any) => ({
        productName: s.productName,
        sku: '',
        quantity: s.quantity,
        price: s.price,
        subtotal: s.total,
      }));
      const calculatedTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
      return {
        id: first.id,
        createdAt: createdAt.toISOString(),
        sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
        sellerId: first.sellerId,
        items,
        itemCount: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        subtotal: calculatedTotal,
        discount: 0,
        total: calculatedTotal,
      };
    });

    grouped.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const result = grouped.map((item: any, idx: number) => ({
      ...item,
      folio: `VTA-${String(idx + 1).padStart(5, '0')}`,
    }));

    const sale = result.find((s: any) => s.folio === folio);
    if (!sale) {
      return NextResponse.json({ message: 'Venta no encontrada.' }, { status: 404 });
    }

    const createdAt = new Date(sale.createdAt);
    return NextResponse.json({
      id: sale.id,
      folio: sale.folio,
      date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      sellerName: sale.sellerName,
      items: sale.items,
      itemCount: sale.itemCount,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
    });
  } catch (error) {
    console.error('Error al buscar venta por folio:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
