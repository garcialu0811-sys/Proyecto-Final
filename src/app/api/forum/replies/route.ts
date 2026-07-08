import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const replies = await dbClient.forumReplies.findMany();
    
    if (user?.role === 'ADMIN') {
      return NextResponse.json(replies);
    } else {
      return NextResponse.json(replies.filter((r: any) => !r.isHidden));
    }
  } catch (error) {
    console.error('Error al obtener respuestas del foro:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Debes iniciar sesión para responder.' }, { status: 401 });
    }

    const user = session.user as any;
    const { postId, content, parentId } = await request.json();

    if (!postId || !content) {
      return NextResponse.json({ message: 'El contenido de la respuesta es obligatorio.' }, { status: 400 });
    }

    const reply = await dbClient.forumReplies.create({
      postId,
      content,
      parentId,
      authorId: user.id,
      authorName: user.name || 'Usuario',
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('Error al crear respuesta:', error);
    return NextResponse.json({ message: 'Error interno del servidor al publicar respuesta.' }, { status: 500 });
  }
}
