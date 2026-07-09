import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { sendNewOrderNotification } from '@/lib/telegram/notifications';
import { checkProductStock } from '@/lib/stock/monitor';

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PED-${y}${m}${d}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'CLIENTE') return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });

    if (!prisma) return NextResponse.json({ message: 'Error de base de datos.' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {
      OR: [
        { userId: user.id },
        { clientName: user.name },
      ],
    };

    if (status) where.status = status;
    if (search) {
      where.AND = [
        {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { productName: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          history: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const stats = {
      total,
      pending: await prisma.order.count({ where: { ...where, status: 'PENDIENTE' } }),
      processing: await prisma.order.count({ where: { ...where, status: 'PROCESANDO' } }),
      inTransit: await prisma.order.count({ where: { ...where, status: 'EN_RUTA' } }),
      delivered: await prisma.order.count({ where: { ...where, status: 'ENTREGADO' } }),
      cancelled: await prisma.order.count({ where: { ...where, status: 'CANCELADO' } }),
    };

    return NextResponse.json({
      orders,
      stats,
      pagination: {
        total,
        totalPages,
        page,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching client orders:', error);
    return NextResponse.json({ message: 'Error al obtener pedidos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'CLIENTE') return NextResponse.json({ message: 'Permisos insuficientes.' }, { status: 403 });

    if (!prisma) return NextResponse.json({ message: 'Error de base de datos.' }, { status: 500 });

    const body = await request.json();
    const { items, phone, address, city, zone, reference, paymentMethod, clientName: bodyClientName, userId: bodyUserId, subtotal: bodySubtotal, shipping: bodyShipping, total: bodyTotal } = body;

    if (!items || !items.length) {
      return NextResponse.json({ message: 'El pedido debe contener al menos un producto.' }, { status: 400 });
    }
    if (!phone || !address) {
      return NextResponse.json({ message: 'Telefono y direccion son obligatorios.' }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ message: 'Seleccione un metodo de pago.' }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();
    const computedSubtotal = bodySubtotal || items.reduce((sum: number, item: any) => sum + (item.price || item.productPrice || 0) * item.quantity, 0);
    const computedShipping = bodyShipping ?? 25;
    const computedTotal = bodyTotal || computedSubtotal + computedShipping;
    const fullAddress = address;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: bodyUserId || user.id,
        productId: items[0].productId || items[0].id,
        productName: items.map((i: any) => i.productName || i.name).join(', '),
        quantity: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        price: computedSubtotal,
        total: computedTotal,
        status: 'PENDIENTE',
        clientName: bodyClientName || user.name || 'Cliente',
        clientPhone: phone,
        clientAddress: fullAddress,
        phone,
        address,
        city: city || null,
        zone: zone || null,
        reference: reference || null,
        paymentMethod,
        subtotal: computedSubtotal,
        shipping: computedShipping,
        discount: 0,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || item.id,
            productName: item.productName || item.name,
            sku: item.sku || null,
            price: item.price || item.productPrice || 0,
            quantity: item.quantity,
            subtotal: (item.price || item.productPrice || 0) * item.quantity,
            image: item.image || item.imageUrl || null,
          })),
        },
        history: {
          create: {
            status: 'PENDIENTE',
            note: 'Pedido creado',
          },
        },
      },
      include: {
        items: true,
        history: true,
      },
    });

    sendNewOrderNotification({
      orderNumber,
      clientName: bodyClientName || user.name || 'Cliente',
      total: computedTotal,
      items: items.map((i: any) => `${i.productName || i.name} x${i.quantity}`).join(', '),
      createdAt: new Date().toLocaleString('es-GT'),
    }).catch(() => {});

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId || item.id } });
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await prisma.product.update({ where: { id: product.id }, data: { stock: newStock } });
        checkProductStock({
          id: product.id,
          name: product.name,
          stock: newStock,
          category: product.category,
          price: product.price,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ order, message: 'Pedido creado exitosamente.' }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ message: 'Error al crear pedido.' }, { status: 500 });
  }
}
