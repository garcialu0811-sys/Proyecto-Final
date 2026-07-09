import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const role = await dbClient.roles.findUnique(id);
    if (!role) {
      return NextResponse.json({ message: 'Rol no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('Error al obtener rol:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, description, isActive } = body;

    const updated = await dbClient.roles.update(id, {
      ...(name !== undefined && { name }),
      ...(displayName !== undefined && { displayName }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    });

    if (!updated) {
      return NextResponse.json({ message: 'Error al actualizar el rol.' }, { status: 500 });
    }

    return NextResponse.json({ role: updated, message: 'Rol actualizado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const role = await dbClient.roles.findUnique(id);
    if (!role) {
      return NextResponse.json({ message: 'Rol no encontrado.' }, { status: 404 });
    }

    if ((role as any).isSystem) {
      return NextResponse.json({ message: 'No se pueden eliminar los roles del sistema.' }, { status: 400 });
    }

    const success = await dbClient.roles.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Error al eliminar el rol.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Rol eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
