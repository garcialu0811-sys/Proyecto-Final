import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { dbClient } from './db/dbClient';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Correo", type: "email", placeholder: "admin@qrshop.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Por favor, ingresa correo y contraseña.');
        }

        const user = await dbClient.users.findUnique(credentials.email);

        if (!user || !user.password) {
          throw new Error('Usuario no encontrado.');
        }

        const isValid = user.password.startsWith('$2b$')
          ? await bcrypt.compare(credentials.password, user.password)
          : credentials.password === user.password;
        if (!isValid) {
          throw new Error('Contraseña incorrecta.');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        const existingUser = await dbClient.users.findUnique(email);
        if (!existingUser) {
          const newUser = await dbClient.users.create({
            email,
            name: user.name || email.split('@')[0],
            password: '',
            role: 'CLIENTE',
          });
          (user as any).id = newUser.id;
          (user as any).role = newUser.role;
        } else {
          (user as any).id = existingUser.id;
          (user as any).role = existingUser.role;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      // If Google sign-in, look up role from DB
      if (token.email && !token.role) {
        const dbUser = await dbClient.users.findUnique(token.email as string);
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.role) token.role = session.role;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'qrshop-secret-super-key-12345678',
};
