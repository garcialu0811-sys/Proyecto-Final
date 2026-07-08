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
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Content edit (by author)
    if (body.content !== undefined) {
      const replies = await dbClient.forumReplies.findMany();
      const reply = replies.find((r: any) => r.id === id);
      if (!reply) {
        return NextResponse.json({ message: 'Respuesta no encontrada.' }, { status: 404 });
      }
      if (reply.authorId !== userId && role !== 'ADMIN') {
        return NextResponse.json({ message: 'Solo puedes editar tus propias respuestas.' }, { status: 403 });
      }
      const updated = await dbClient.forumReplies.updateContent(id, body.content);
      if (!updated) {
        return NextResponse.json({ message: 'Error al actualizar.' }, { status: 500 });
      }
      return NextResponse.json(updated);
    }

    // Moderation (ADMIN only)
    if (role !== 'ADMIN') {
      return NextResponse.json({ message: 'Solo ADMIN puede moderar.' }, { status: 403 });
    }

    if (body.isHidden !== undefined) {
      const updated = await dbClient.forumReplies.updateVisibility(id, body.isHidden);
      if (!updated) {
        return NextResponse.json({ message: 'Respuesta no encontrada.' }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: 'Operación no reconocida.' }, { status: 400 });
  } catch (error) {
    console.error('Error al actualizar respuesta:', error);
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
    if (!session) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const replies = await dbClient.forumReplies.findMany();
    const reply = replies.find((r: any) => r.id === id);
    if (!reply) {
      return NextResponse.json({ message: 'Respuesta no encontrada.' }, { status: 404 });
    }
    if (reply.authorId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ message: 'No tienes permiso para eliminar esta respuesta.' }, { status: 403 });
    }

    const success = await dbClient.forumReplies.delete(id);
    if (!success) {
      return NextResponse.json({ message: 'Error al eliminar.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Respuesta eliminada.' });
  } catch (error) {
    console.error('Error al eliminar respuesta:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
