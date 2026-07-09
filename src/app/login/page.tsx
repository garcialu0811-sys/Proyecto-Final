'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { QrCode, Mail, Lock, LogIn } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
    
    const error = searchParams.get('error');
    if (error) {
      showToast('Credenciales incorrectas o error de inicio de sesión.', 'error');
    }
  }, [status, router, searchParams, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor, completa todos los campos.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        showToast(res.error || 'Credenciales inválidas', 'error');
      } else {
        showToast('¡Inicio de sesión exitoso!', 'success');
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      showToast('Ocurrió un error inesperado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <img src="/logo.png" alt="Variedades Coatán" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
        <span>Variedades Coatán</span>
      </div>

      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
        ¡Bienvenido de nuevo!
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
        Ingresa tus credenciales para acceder al sistema.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <div style={{ position: 'relative' }}>
            <Suspense fallback={null}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
            </Suspense>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="ejemplo@qrshop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '40px' }}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <Suspense fallback={null}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
            </Suspense>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '40px' }}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '10px' }}
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Iniciar Sesión'}
          {!loading && <LogIn size={18} />}
        </button>
      </form>

      <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div style={{ height: '1px', backgroundColor: 'var(--border)', flex: 1 }}></div>
        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>O CONTINÚA CON</span>
        <div style={{ height: '1px', backgroundColor: 'var(--border)', flex: 1 }}></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn btn-secondary"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Google
      </button>

      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '24px' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Regístrate aquí
        </Link>
      </p>

      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Credenciales de prueba:</p>
        <p>• Admin: <b>admin@qrshop.com</b> / <b>admin123</b></p>
        <p>• Vendedor: <b>vendedor@qrshop.com</b> / <b>vendedor123</b></p>
        <p>• Cliente: <b>cliente@qrshop.com</b> / <b>cliente123</b></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-wrapper">
      <Suspense fallback={<div className="text-center">Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
