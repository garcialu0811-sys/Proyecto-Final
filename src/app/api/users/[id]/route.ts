import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function PUT(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden modificar usuarios.' }, { status: 403 });
    }

    const { name, email, role } = await request.json();
    
    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const updated = await dbClient.users.update(id, { name, email, role });
    if (!updated) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
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
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden eliminar usuarios.' }, { status: 403 });
    }

    // No permitir que el administrador se elimine a sí mismo
    if ((session.user as any).id === id) {
      return NextResponse.json({ message: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
    }

    const success = await dbClient.users.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuario eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
