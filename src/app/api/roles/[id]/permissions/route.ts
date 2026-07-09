import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

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
    const { permissions } = body;

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ message: 'Permisos invalidos.' }, { status: 400 });
    }

    const updated = await dbClient.roles.updatePermissions(id, permissions);
    if (!updated) {
      return NextResponse.json({ message: 'Error al actualizar permisos.' }, { status: 500 });
    }

    return NextResponse.json({ role: updated, message: 'Permisos actualizados exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
