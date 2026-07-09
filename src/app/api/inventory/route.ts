import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stockFilter = searchParams.get('stock') || '';
    const location = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let products = await dbClient.products.findMany();

    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s)) ||
        p.description.toLowerCase().includes(s)
      );
    }

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (stockFilter) {
      switch (stockFilter) {
        case 'low':
          products = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 5));
          break;
        case 'out':
          products = products.filter(p => p.stock === 0);
          break;
        case 'optimal':
          products = products.filter(p => p.stock > (p.minStock || 5));
          break;
      }
    }

    if (location) {
      products = products.filter(p =>
        p.location?.warehouse?.toLowerCase().includes(location.toLowerCase())
      );
    }

    const allProducts = await dbClient.products.findMany();
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalCostValue = allProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.stock), 0);
    const totalProducts = allProducts.length;
    const totalUnits = allProducts.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = allProducts.filter(p => p.stock > 0 && p.stock <= (p.minStock || 5)).length;
    const outOfStockCount = allProducts.filter(p => p.stock === 0).length;

    const categoryMap: Record<string, { value: number; count: number; costValue: number }> = {};
    allProducts.forEach(p => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { value: 0, count: 0, costValue: 0 };
      }
      categoryMap[p.category].value += p.price * p.stock;
      categoryMap[p.category].costValue += (p.costPrice || 0) * p.stock;
      categoryMap[p.category].count += 1;
    });

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      value: data.value,
      costValue: data.costValue,
      count: data.count,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    const locations = [...new Set(allProducts.map(p => p.location?.warehouse).filter(Boolean))];
    const productCategories = [...new Set(allProducts.map(p => p.category))];

    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedProducts = products.slice(start, start + limit);

    const lowStockProducts = allProducts
      .filter(p => p.stock > 0 && p.stock <= (p.minStock || 5))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    return NextResponse.json({
      products: paginatedProducts,
      metrics: {
        totalValue,
        totalCostValue,
        totalProducts,
        totalUnits,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        movementsToday: 0,
      },
      categories,
      locations,
      productCategories,
      lowStockProducts,
      recentMovements: [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return NextResponse.json({ message: 'Error al obtener inventario' }, { status: 500 });
  }
}
