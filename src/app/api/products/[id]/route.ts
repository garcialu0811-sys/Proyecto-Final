import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const product = await dbClient.products.findUnique(id);
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado. Por favor inicia sesión.' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'VENDEDOR') {
      return NextResponse.json({ message: 'Permisos insuficientes para editar productos.' }, { status: 403 });
    }

    const body = await request.json();
    const product = await dbClient.products.findUnique(id);
    
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    let updateData: any = {};

    if (role === 'ADMIN') {
      updateData = {
        name: body.name || product.name,
        description: body.description || product.description,
        price: body.price !== undefined ? Number(body.price) : product.price,
        stock: body.stock !== undefined ? Number(body.stock) : product.stock,
        category: body.category || product.category,
        imageUrl: body.imageUrl || product.imageUrl,
        minStock: body.minStock !== undefined ? Number(body.minStock) : (product.minStock ?? 5),
        costPrice: body.costPrice !== undefined ? Number(body.costPrice) : (product.costPrice ?? 0),
        location: body.location || product.location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
      };
    } else if (role === 'VENDEDOR') {
      updateData = {
        price: body.price !== undefined ? Number(body.price) : product.price,
        stock: body.stock !== undefined ? Number(body.stock) : product.stock,
        minStock: body.minStock !== undefined ? Number(body.minStock) : (product.minStock ?? 5),
        location: body.location || product.location,
      };
    }

    const updated = await dbClient.products.update(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar producto.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden eliminar productos.' }, { status: 403 });
    }

    const success = await dbClient.products.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Producto eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ message: 'Error interno del servidor al eliminar producto.' }, { status: 500 });
  }
}
