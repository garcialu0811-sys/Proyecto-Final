'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Lock, Eye, EyeOff, User, Phone, Shield, Zap, BarChart3,
  UserPlus, AlertCircle, ShoppingBag
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

function RegisterContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      showToast('Por favor, completa todos los campos obligatorios.', 'warning');
      return;
    }
    if (form.password.length < 6) {
      showToast('La contrasena debe tener al menos 6 caracteres.', 'warning');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showToast('Las contrasenas no coinciden.', 'warning');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Error al registrar.');
        showToast(data.message || 'Error al registrar', 'error');
        return;
      }
      showToast('Cuenta creada exitosamente!', 'success');
      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      if (signInResult?.ok) {
        showToast('Inicio de sesion exitoso!', 'success');
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch {
      setError('Error al conectar con el servidor.');
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
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
        <div className="auth-hero" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #e0f7fa 30%, #b2ebf2 70%, #0891b2 100%)', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', minHeight: '720px' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(8,145,178,0.08)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(8,145,178,0.06)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src="/logo.png" alt="Variedades Coatan" style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'contain', marginBottom: '24px', background: '#fff', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <h1 style={{ fontSize: '15px', color: '#374151', fontWeight: 500, marginBottom: '4px' }}>Bienvenido a</h1>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#0891b2', marginBottom: '16px', lineHeight: 1.2 }}>Variedades Coatan</h2>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7, maxWidth: '320px' }}>Crea tu cuenta y empieza a gestionar tu negocio de forma inteligente con nuestra plataforma.</p>

            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              {[
                { icon: <Shield size={22} />, title: 'Seguridad', desc: 'Protegemos tu informacion' },
                { icon: <Zap size={22} />, title: 'Rapidez', desc: 'Todo al alcance de un clic' },
                { icon: <BarChart3 size={22} />, title: 'Eficiencia', desc: 'Gestiona y haz crecer tu negocio' },
              ].map((b, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#0891b2' }}>{b.icon}</div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{b.title}</p>
                  <p style={{ fontSize: '10px', color: '#6b7280' }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, marginTop: '32px', background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280' }}>Ventas del dia</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Q18,750.00</p>
              </div>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280' }}>Pedidos</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>124</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Right */}
        <div className="auth-form" style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: '380px', margin: '0 auto', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UserPlus size={26} style={{ color: '#0891b2' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Crear cuenta</h2>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>Completa el formulario para registrarte</p>
            </div>

            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nombre *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Tu nombre completo"
                    required
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Correo electronico *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    required
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Telefono</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="1234-5678"
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Contrasena *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimo 6 caracteres"
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Confirmar contrasena *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repite tu contrasena"
                    required
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0891b2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

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
                    Crear mi cuenta
                    <UserPlus size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>o continua con</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

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

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '20px' }}>
              Ya tienes cuenta?{' '}
              <Link href="/login" style={{ color: '#0891b2', fontWeight: 600, textDecoration: 'none' }}>Inicia sesion aqui</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
