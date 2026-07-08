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
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();

    // Like toggle
    if (body.like) {
      const userId = (session.user as any).id;
      const updated = await dbClient.forumPosts.toggleLike(id, userId);
      if (!updated) {
        return NextResponse.json({ message: 'Post no encontrado.' }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    // Moderation (ADMIN only)
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Solo ADMIN puede moderar.' }, { status: 403 });
    }

    if (body.isHidden !== undefined) {
      const updated = await dbClient.forumPosts.updateVisibility(id, body.isHidden);
      if (!updated) {
        return NextResponse.json({ message: 'Post no encontrado.' }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: 'Operación no reconocida.' }, { status: 400 });
  } catch (error) {
    console.error('Error al actualizar post:', error);
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
      return NextResponse.json({ message: 'No autorizado. Solo administradores pueden eliminar posts.' }, { status: 403 });
    }

    const success = await dbClient.forumPosts.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Post no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Post y sus respuestas eliminados con éxito.' });
  } catch (error) {
    console.error('Error al eliminar post:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
