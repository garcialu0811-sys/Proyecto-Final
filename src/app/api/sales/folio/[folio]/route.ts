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

    const matchingSales = allSales.filter((s: any) => s.folio === folio);
    if (!matchingSales.length) {
      return NextResponse.json({ message: 'Venta no encontrada.' }, { status: 404 });
    }

    matchingSales.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const first = matchingSales[0];
    const createdAt = new Date(first.createdAt);
    const items = matchingSales.map((s: any) => ({
      productId: s.productId,
      productName: s.productName,
      sku: '',
      quantity: s.quantity,
      price: s.price,
      subtotal: s.total,
    }));
    const calculatedTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

    return NextResponse.json({
      id: first.id,
      folio: first.folio,
      date: createdAt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: createdAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      sellerName: sellerMap[first.sellerId]?.name || 'Vendedor',
      items,
      itemCount: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      subtotal: calculatedTotal,
      discount: 0,
      total: calculatedTotal,
      saleType: (first as any).saleType || 'VENTA',
      saleTypeNote: (first as any).saleTypeNote || '',
    });
  } catch (error) {
    console.error('Error al buscar venta por folio:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
