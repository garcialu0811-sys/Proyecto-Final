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

    const rawUser = await dbClient.users.findById(id);
    if (!rawUser) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }
    const user = rawUser as any;

    return NextResponse.json({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'CLIENT',
      isActive: user.isActive !== false,
      lastLogin: user.lastLogin || user.updatedAt || null,
      createdAt: user.createdAt,
      image: user.image || null,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
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
    const { name, email, role, phone, isActive, password } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password && password.length >= 6) {
      const { hash } = await import('bcryptjs');
      updateData.password = await hash(password, 12);
    }

    const rawUpdated = await dbClient.users.update(id, updateData);
    if (!rawUpdated) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }
    const updated = rawUpdated as any;

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone || '',
      isActive: updated.isActive !== false,
      message: 'Usuario actualizado exitosamente.',
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
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

    if ((session.user as any).id === id) {
      return NextResponse.json({ message: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
    }

    const success = await dbClient.users.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
