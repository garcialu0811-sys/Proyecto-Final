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
    const sales = await dbClient.sales.findMany();

    if (user.role === 'ADMIN') {
      return NextResponse.json(sales);
    } else if (user.role === 'VENDEDOR') {
      // Filtrar para que el vendedor solo vea sus propias ventas
      const mySales = sales.filter((s: any) => s.sellerId === user.id);
      return NextResponse.json(mySales);
    } else {
      return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado. Por favor inicia sesión.' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes para registrar ventas.' }, { status: 403 });
    }

    const { productId, quantity, clientName, clientPhone, clientAddress } = await request.json();

    if (!productId || !quantity || Number(quantity) <= 0) {
      return NextResponse.json({ message: 'Datos de venta inválidos.' }, { status: 400 });
    }

    // 1. Validar producto y existencias
    const product = await dbClient.products.findUnique(productId);
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    const qty = Number(quantity);
    if (product.stock < qty) {
      return NextResponse.json({ 
        message: `Existencias insuficientes. Disponibles: ${product.stock}, Solicitadas: ${qty}` 
      }, { status: 400 });
    }

    // 2. Restar existencias en MongoDB
    await dbClient.products.update(productId, {
      stock: product.stock - qty
    });

    const total = product.price * qty;

    // 3. Registrar venta en SQL (a través de dbClient)
    const sale = await dbClient.sales.create({
      productId,
      productName: product.name,
      quantity: qty,
      price: product.price,
      total,
      sellerId: user.id
    });

    // 4. Registrar pedido en SQL para el flujo de entregas
    await dbClient.orders.create({
      productId,
      productName: product.name,
      quantity: qty,
      price: product.price,
      total,
      status: 'PENDIENTE',
      clientName: clientName || 'Venta Rápida / Mostrador',
      clientPhone: clientPhone || '',
      clientAddress: clientAddress || '',
      driverId: user.role === 'VENDEDOR' ? user.id : undefined,
      driverName: user.role === 'VENDEDOR' ? user.name : undefined
    });

    return NextResponse.json({ sale, message: 'Venta y pedido registrados con éxito.' }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return NextResponse.json({ message: 'Error interno al registrar venta.' }, { status: 500 });
  }
}
