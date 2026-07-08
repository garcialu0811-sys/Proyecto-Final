import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;

    // Proteger rutas de gestión de inventario y ventas (ADMIN y VENDEDOR)
    const staffPaths = ['/dashboard', '/sales', '/categories', '/inventory', '/scan', '/deliveries'];
    if (staffPaths.some(p => path.startsWith(p))) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Proteger rutas de administración de usuarios (Solo ADMIN)
    const adminPaths = ['/users', '/roles'];
    if (adminPaths.some(p => path.startsWith(p))) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    }
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/sales/:path*', 
    '/categories/:path*', 
    '/inventory/:path*', 
    '/scan/:path*', 
    '/orders/:path*', 
    '/deliveries/:path*', 
    '/users/:path*', 
    '/roles/:path*', 
    '/profile/:path*', 
    '/forum/:path*'
  ],
};
