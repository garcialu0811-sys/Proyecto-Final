import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const posts = await dbClient.forumPosts.findMany();
    
    if (user?.role === 'ADMIN') {
      return NextResponse.json(posts);
    } else {
      return NextResponse.json(posts.filter((p: any) => !p.isHidden));
    }
  } catch (error) {
    console.error('Error al obtener posts del foro:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Debes iniciar sesión para publicar.' }, { status: 401 });
    }

    const user = session.user as any;
    const { title, content, category } = await request.json();

    if (!title || !content || !category) {
      return NextResponse.json({ message: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const post = await dbClient.forumPosts.create({
      title,
      content,
      category,
      authorId: user.id,
      authorName: user.name || 'Usuario',
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error al crear post:', error);
    return NextResponse.json({ message: 'Error interno al publicar tema.' }, { status: 500 });
  }
}
