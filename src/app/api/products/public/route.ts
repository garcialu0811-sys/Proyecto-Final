import { NextRequest, NextResponse } from 'next/server';
import { fallbackDb } from '@/lib/db/fallbackDb';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const availability = searchParams.get('availability') || '';
    const sortBy = searchParams.get('sortBy') || 'popular';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');

    let products = await dbClient.products.findMany();
    products = products.filter((p: any) => p.isActive !== false);

    if (search) {
      const s = search.toLowerCase();
      products = products.filter((p: any) =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s)
      );
    }

    if (category) {
      products = products.filter((p: any) => p.category === category);
    }

    products = products.filter((p: any) => p.price >= minPrice && p.price <= maxPrice);

    if (availability) {
      switch (availability) {
        case 'available':
          products = products.filter((p: any) => p.stock > 0);
          break;
        case 'out_of_stock':
          products = products.filter((p: any) => p.stock === 0);
          break;
      }
    }

    const totalProducts = products.length;
    const availableCount = products.filter((p: any) => p.stock > 0).length;
    const outOfStockCount = products.filter((p: any) => p.stock === 0).length;

    switch (sortBy) {
      case 'price_asc':
        products.sort((a: any, b: any) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a: any, b: any) => b.price - a.price);
        break;
      case 'name':
        products.sort((a: any, b: any) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        products.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        products.sort((a: any, b: any) => b.stock - a.stock);
    }

    const totalPages = Math.ceil(totalProducts / limit);
    const start = (page - 1) * limit;
    const paginatedProducts = products.slice(start, start + limit);

    const categoryMap: Record<string, number> = {};
    products.forEach((p: any) => {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    });

    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      products: paginatedProducts,
      categories,
      filters: {
        totalProducts,
        availableCount,
        outOfStockCount,
      },
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}
