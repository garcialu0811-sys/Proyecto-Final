import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';
import { hash } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let allUsers: any[] = await dbClient.users.findMany();

    if (search) {
      const s = search.toLowerCase();
      allUsers = allUsers.filter((u: any) =>
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.id && u.id.toLowerCase().includes(s))
      );
    }

    if (role && role !== 'all') {
      allUsers = allUsers.filter((u: any) => u.role === role);
    }

    if (status === 'active') {
      allUsers = allUsers.filter((u: any) => u.isActive !== false);
    } else if (status === 'inactive') {
      allUsers = allUsers.filter((u: any) => u.isActive === false);
    }

    allUsers.sort((a: any, b: any) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = allUsers.slice(start, start + limit);

    const safeUsers = paginated.map((u: any) => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'VENDEDOR',
      isActive: u.isActive !== false,
      lastLogin: u.lastLogin || u.updatedAt || null,
      createdAt: u.createdAt,
      image: u.image || null,
    }));

    const stats = {
      total: allUsers.length,
      active: allUsers.filter((u: any) => u.isActive !== false).length,
      admins: allUsers.filter((u: any) => u.role === 'ADMIN').length,
      sellers: allUsers.filter((u: any) => u.role === 'VENDEDOR').length,
      clients: 0,
    };

    return NextResponse.json({
      users: safeUsers,
      stats,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, phone, isActive } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Nombre, email y contrasena son obligatorios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'La contrasena debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const existing = await dbClient.users.findUnique(email);
    if (existing) {
      return NextResponse.json({ message: 'Ya existe un usuario con ese email.' }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);
    const newUser = await dbClient.users.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'VENDEDOR',
      phone: phone || null,
      isActive: isActive !== false,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      message: 'Usuario creado exitosamente.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
