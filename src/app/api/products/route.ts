import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stockFilter = searchParams.get('stock') || '';
    const statusFilter = searchParams.get('status') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    let allProducts = await dbClient.products.findMany();

    if (search) {
      const s = search.toLowerCase();
      allProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s))
      );
    }
    if (category) {
      allProducts = allProducts.filter(p => p.category === category);
    }
    if (stockFilter === 'low') {
      allProducts = allProducts.filter(p => p.stock > 0 && p.stock <= 5);
    } else if (stockFilter === 'out') {
      allProducts = allProducts.filter(p => p.stock === 0);
    }
    if (statusFilter === 'active') {
      allProducts = allProducts.filter(p => p.isActive !== false);
    } else if (statusFilter === 'inactive') {
      allProducts = allProducts.filter(p => p.isActive === false);
    }
    if (minPrice) {
      allProducts = allProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      allProducts = allProducts.filter(p => p.price <= parseFloat(maxPrice));
    }

    const total = allProducts.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const products = allProducts.slice(start, start + limit);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ message: 'Error interno al obtener productos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden agregar productos.' }, { status: 403 });
    }

    const { name, description, price, stock, category, imageUrl, sku, minStock, costPrice, location } = await request.json();

    if (!name || !description || price === undefined || stock === undefined || !category) {
      return NextResponse.json({ message: 'Campos incompletos obligatorios.' }, { status: 400 });
    }

    const generatedSku = sku || name.substring(0, 3).toUpperCase().replace(/\s/g, '') + '-' + String(Date.now()).slice(-3);

    const tempProduct = await dbClient.products.create({
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      sku: generatedSku,
      imageUrl: imageUrl || '',
      qrCode: '',
      isActive: true,
      minStock: minStock !== undefined ? Number(minStock) : 5,
      costPrice: costPrice !== undefined ? Number(costPrice) : 0,
      location: location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
    });

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(tempProduct.id, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a2a3a',
          light: '#ffffff'
        }
      });
    } catch (qrErr) {
      console.error('Error generando QR:', qrErr);
    }

    if (qrDataUrl) {
      await dbClient.products.update(tempProduct.id, { qrCode: qrDataUrl });
    }

    return NextResponse.json(tempProduct, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto con QR:', error);
    return NextResponse.json({ message: 'Error interno del servidor al crear producto.' }, { status: 500 });
  }
}
