'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Lock, Eye, EyeOff, Shield, Zap, BarChart3,
  LogIn, AlertCircle, KeyRound
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );
}

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor, completa todos los campos.', 'warning');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError('Credenciales invalidas. Verifica tu email y contrasena.');
        showToast('Credenciales invalidas', 'error');
      } else if (result?.ok) {
        showToast('Inicio de sesion exitoso!', 'success');
        router.push(callbackUrl);
      }
    } catch {
      setError('Error al iniciar sesion. Intenta nuevamente.');
      showToast('Error al iniciar sesion', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #eff6ff 100%)', padding: '16px' }}>
      <div className="auth-grid" style={{ width: '100%', maxWidth: '1050px', background: '#fff', borderRadius: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e5e7eb' }}>

        {/* Hero Left */}
        <div className="auth-hero" style={{
          background: 'linear-gradient(160deg, #e8f4f8 0%, #d1ecf1 30%, #a8d8ea 60%, #0891b2 100%)',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '680px'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ position: 'absolute', top: '40px', right: '60px', width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ position: 'absolute', top: '80px', right: '120px', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ position: 'absolute', top: '20px', right: '180px', width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo - transparent, no background */}
            <img src="/logo.png" alt="Variedades Coatan" style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '28px' }} />

            {/* Title */}
            <h1 style={{ fontSize: '15px', color: '#1e3a5f', fontWeight: 500, marginBottom: '6px' }}>Bienvenido a</h1>
            <h2 style={{ fontSize: '34px', fontWeight: 800, color: '#0891b2', marginBottom: '20px', lineHeight: 1.15 }}>Variedades Coatan</h2>

            {/* Subtitle */}
            <p style={{ fontSize: '15px', color: '#4a6d8c', lineHeight: 1.7, maxWidth: '400px' }}>
              Tu plataforma inteligente para gestionar productos, pedidos y clientes de forma facil, rapida y segura.
            </p>

            {/* Benefits - glass cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '36px' }}>
              {[
                { icon: <Shield size={22} />, title: 'Seguridad', desc: 'Protegemos tu informacion' },
                { icon: <Zap size={22} />, title: 'Rapidez', desc: 'Todo al alcance de un clic' },
                { icon: <BarChart3 size={22} />, title: 'Eficiencia', desc: 'Gestiona y haz crecer tu negocio' },
              ].map((b, i) => (
                <div key={i} style={{
                  padding: '18px 14px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}>
                  <div style={{ color: '#0e7490', marginBottom: '10px' }}>{b.icon}</div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>{b.title}</p>
                  <p style={{ fontSize: '11px', color: '#4a6d8c', lineHeight: 1.4 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview mockup */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginTop: '36px',
            background: '#fff',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            maxWidth: '340px'
          }}>
            {/* Window dots */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            </div>
            {/* Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>Ventas del dia</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>$18,750.00</p>
                <p style={{ fontSize: '9px', color: '#22c55e', fontWeight: 600 }}>+12.5%</p>
              </div>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>Pedidos</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>124</p>
                <p style={{ fontSize: '9px', color: '#22c55e', fontWeight: 600 }}>+8.1%</p>
              </div>
            </div>
            <div style={{ marginTop: '10px', background: '#f0fdfa', borderRadius: '8px', padding: '10px' }}>
              <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>Clientes</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>89</p>
              <p style={{ fontSize: '9px', color: '#22c55e', fontWeight: 600 }}>+5.4%</p>
            </div>
          </div>
        </div>

        {/* Form Right - UNCHANGED */}
        <div className="auth-form" style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: '380px', margin: '0 auto', width: '100%' }}>
            {/* Icon */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <KeyRound size={26} style={{ color: '#0891b2' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Iniciar sesion</h2>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>Ingresa tus credenciales para acceder al sistema</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Correo electronico</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor@qrshop.com"
                    required
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Contrasena</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4b5563', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#0891b2', cursor: 'pointer' }}
                  />
                  Recordarme
                </label>
                <Link href="/forgot-password" style={{ fontSize: '13px', color: '#0891b2', textDecoration: 'none', fontWeight: 500 }}>
                  Olvidaste tu contrasena?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1, transition: 'all 0.2s',
                }}
              >
                {isLoading ? (
                  <div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    Iniciar sesion
                    <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>o continua con</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{
                width: '100%', padding: '11px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#374151', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <GoogleIcon size={18} />
              Continuar con Google
            </button>

            {/* Register link */}
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '20px' }}>
              No tienes cuenta?{' '}
              <Link href="/register" style={{ color: '#0891b2', fontWeight: 600, textDecoration: 'none' }}>Registrate aqui</Link>
            </p>

            {/* Demo credentials */}
            <div style={{ marginTop: '24px', padding: '16px', background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={14} style={{ color: '#0891b2' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f766e' }}>Credenciales de prueba</span>
              </div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.8 }}>
                <button onClick={() => handleDemoLogin('admin@qrshop.com', 'admin123')} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4b5563', padding: '2px 0', fontFamily: 'inherit' }}>
                  <strong>Admin:</strong> admin@qrshop.com / admin123
                </button>
                <button onClick={() => handleDemoLogin('vendedor@qrshop.com', 'vendedor123')} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4b5563', padding: '2px 0', fontFamily: 'inherit' }}>
                  <strong>Vendedor:</strong> vendedor@qrshop.com / vendedor123
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
