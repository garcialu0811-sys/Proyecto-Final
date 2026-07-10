import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/dbClient';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const existingUser = await dbClient.users.findUnique(email);
    if (existingUser) {
      return NextResponse.json({ message: 'El correo ya está registrado.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await dbClient.users.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'VENDEDOR'
    });

    return NextResponse.json({ 
      message: 'Usuario registrado exitosamente.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    }, { status: 201 });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ message: 'Error interno del servidor al registrar.' }, { status: 500 });
  }
}
