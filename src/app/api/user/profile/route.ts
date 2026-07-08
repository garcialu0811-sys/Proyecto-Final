import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const user = session.user as any;
    const { name, currentPassword, newPassword } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'El nombre es obligatorio.' }, { status: 400 });
    }

    const updateData: any = { name };

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'Debes ingresar tu contraseña actual para cambiarla.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
      }

      const existingUser = await dbClient.users.findById(user.id);
      if (!existingUser) {
        return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
      }

      if (!existingUser.password) {
        return NextResponse.json({ message: 'El usuario no tiene contraseña configurada.' }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isValid) {
        return NextResponse.json({ message: 'La contraseña actual es incorrecta.' }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await dbClient.users.update(user.id, updateData);
    if (!updated) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      message: newPassword ? 'Contraseña cambiada exitosamente.' : 'Perfil actualizado.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
