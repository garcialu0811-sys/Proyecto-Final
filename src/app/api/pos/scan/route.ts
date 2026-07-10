import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'VENDEDOR') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, productId } = body;

    if (!sessionId || !productId) {
      return NextResponse.json(
        { error: 'sessionId y productId son requeridos' },
        { status: 400 }
      );
    }

    // Find active POS session
    const posSession = await prisma!.posSession.findFirst({
      where: {
        sessionId,
        status: 'ACTIVE',
        sellerId: user.id,
      },
    });

    if (!posSession) {
      return NextResponse.json(
        { error: 'Sesion no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // Find product
    const product = await prisma!.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Producto inactivo' },
        { status: 400 }
      );
    }

    if (product.stock <= 0) {
      return NextResponse.json(
        { error: 'Producto sin stock disponible' },
        { status: 400 }
      );
    }

    // Check if product already exists in cart
    const existingItem = await prisma!.posItem.findFirst({
      where: {
        sessionId: posSession.id,
        productId: product.id,
      },
    });

    let item;
    let isNew = false;

    if (existingItem) {
      // INCREMENT quantity by 1
      const newQuantity = existingItem.quantity + 1;
      const newSubtotal = product.price * newQuantity;

      item = await prisma!.posItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal: newSubtotal,
        },
      });
    } else {
      // CREATE new item with quantity 1
      isNew = true;
      item = await prisma!.posItem.create({
        data: {
          sessionId: posSession.id,
          productId: product.id,
          productName: product.name,
          sku: product.sku || 'N/A',
          price: product.price,
          quantity: 1,
          subtotal: product.price,
          image: product.imageUrl || '',
        },
      });
    }

    // Recalculate totals
    const allItems = await prisma!.posItem.findMany({
      where: { sessionId: posSession.id },
    });

    const subtotal = allItems.reduce((sum, i) => sum + i.subtotal, 0);

    await prisma!.posSession.update({
      where: { id: posSession.id },
      data: { subtotal, total: subtotal },
    });

    // Return complete updated cart
    const updatedItems = await prisma!.posItem.findMany({
      where: { sessionId: posSession.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: isNew
        ? `${product.name} agregado al carrito`
        : `${product.name} +1 (Total: ${item.quantity})`,
      item: {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        image: item.image,
        isNew,
      },
      totals: {
        subtotal,
        total: subtotal,
        itemCount: allItems.length,
        totalItems: allItems.reduce((sum, i) => sum + i.quantity, 0),
      },
      cart: updatedItems,
    });
  } catch (error) {
    console.error('Error scanning product:', error);
    return NextResponse.json(
      { error: 'Error al procesar el escaneo' },
      { status: 500 }
    );
  }
}
