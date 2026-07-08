import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden ver usuarios.' }, { status: 403 });
    }

    const users = await dbClient.users.findMany();
    // Excluir contraseñas en la respuesta
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
