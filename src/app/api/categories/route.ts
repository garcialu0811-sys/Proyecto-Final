import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import { fallbackDb } from '@/lib/db/fallbackDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const categories = fallbackDb.categories.findMany();
    const products = await dbClient.products.findMany();

    const productCounts: { [key: string]: number } = {};
    products.forEach((p: any) => {
      productCounts[p.category] = (productCounts[p.category] || 0) + 1;
    });

    let enriched = categories.map(c => ({
      ...c,
      productCount: productCounts[c.name] || 0,
    }));

    if (search) {
      const s = search.toLowerCase();
      enriched = enriched.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s)
      );
    }
    if (status === 'active') {
      enriched = enriched.filter(c => c.isActive);
    } else if (status === 'inactive') {
      enriched = enriched.filter(c => !c.isActive);
    }

    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    const totalProducts = products.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    let mostUsed = { name: 'N/A', count: 0 };
    for (const [name, count] of Object.entries(productCounts)) {
      if (count > mostUsed.count) mostUsed = { name, count };
    }

    return NextResponse.json({
      categories: paginated,
      metrics: {
        totalCategories: categories.length,
        activeCategories,
        totalProducts,
        mostUsedCategory: mostUsed.name,
        mostUsedCount: mostUsed.count,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error al obtener categorias:', error);
    return NextResponse.json({ message: 'Error al obtener categorias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const { name, description, icon, color, isActive } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ message: 'El nombre es requerido.' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ message: 'La descripcion es requerida.' }, { status: 400 });
    }

    const existing = fallbackDb.categories.findByName(name.trim());
    if (existing) {
      return NextResponse.json({ message: 'Ya existe una categoria con ese nombre.' }, { status: 400 });
    }

    const newCategory = fallbackDb.categories.create({
      name: name.trim(),
      description: description.trim(),
      icon: icon || 'Tag',
      color: color || '#3B82F6',
      isActive: isActive !== false,
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error al crear categoria:', error);
    return NextResponse.json({ message: 'Error al crear categoria.' }, { status: 500 });
  }
}
