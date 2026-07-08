import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import { fallbackDb } from '@/lib/db/fallbackDb';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Solo ADMIN puede editar categorias.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, color, isActive, moveToCategory } = body;

    const existing = fallbackDb.categories.findUnique(id);
    if (!existing) {
      return NextResponse.json({ message: 'Categoria no encontrada.' }, { status: 404 });
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = fallbackDb.categories.findByName(name.trim());
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ message: 'Ya existe una categoria con ese nombre.' }, { status: 400 });
      }
    }

    const updated = fallbackDb.categories.update(id, {
      name: name !== undefined ? name.trim() : existing.name,
      description: description !== undefined ? description.trim() : existing.description,
      icon: icon !== undefined ? icon : existing.icon,
      color: color !== undefined ? color : existing.color,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    });

    if (name && name.trim() !== existing.name) {
      const products = await dbClient.products.findMany();
      const toUpdate = products.filter((p: any) => p.category === existing.name);
      for (const product of toUpdate) {
        await dbClient.products.update(product.id, { category: name.trim() });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar categoria:', error);
    return NextResponse.json({ message: 'Error al actualizar categoria.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Solo ADMIN puede eliminar categorias.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = fallbackDb.categories.findUnique(id);
    if (!existing) {
      return NextResponse.json({ message: 'Categoria no encontrada.' }, { status: 404 });
    }

    const products = await dbClient.products.findMany();
    const productsInCategory = products.filter((p: any) => p.category === existing.name);

    if (productsInCategory.length > 0) {
      const body = await request.json().catch(() => ({}));
      const moveTo = body?.moveToCategory;

      if (moveTo) {
        for (const product of productsInCategory) {
          await dbClient.products.update(product.id, { category: moveTo });
        }
      } else {
        return NextResponse.json({
          message: `Esta categoria tiene ${productsInCategory.length} productos asociados.`,
          productCount: productsInCategory.length,
          requiresAction: true,
        }, { status: 400 });
      }
    }

    fallbackDb.categories.delete(id);
    return NextResponse.json({ message: 'Categoria eliminada.' });
  } catch (error) {
    console.error('Error al eliminar categoria:', error);
    return NextResponse.json({ message: 'Error al eliminar categoria.' }, { status: 500 });
  }
}
