import { NextRequest, NextResponse } from 'next/server';
import { fallbackDb } from '@/lib/db/fallbackDb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, type, quantity, reason, reference, userId, userName } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const product = fallbackDb.products.findUnique(productId);
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    switch (type) {
      case 'IN':
        newStock = previousStock + quantity;
        break;
      case 'OUT':
        if (quantity > previousStock) {
          return NextResponse.json({ message: 'Stock insuficiente' }, { status: 400 });
        }
        newStock = previousStock - quantity;
        break;
      case 'ADJUSTMENT':
        newStock = quantity;
        break;
      default:
        return NextResponse.json({ message: 'Tipo de movimiento invalido' }, { status: 400 });
    }

    // Update product stock
    fallbackDb.products.update(productId, { stock: newStock });

    // Create movement record
    const movement = fallbackDb.movements.create({
      productId,
      productName: product.name,
      sku: product.sku,
      type,
      quantity,
      previousStock,
      newStock,
      reason: reason || (type === 'IN' ? 'Entrada de stock' : type === 'OUT' ? 'Salida de stock' : 'Ajuste de inventario'),
      reference: reference || '',
      userId: userId || 'system',
      userName: userName || 'Sistema',
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error al registrar movimiento' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let movements;
    if (productId) {
      movements = fallbackDb.movements.findByProduct(productId);
    } else {
      movements = fallbackDb.movements.findMany(limit);
    }

    return NextResponse.json(movements);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
