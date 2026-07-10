'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, LogIn } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { pendingProduct, addItem, setPendingProduct } = useCartStore();
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Credenciales incorrectas. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    if (pendingProduct) {
      addItem(pendingProduct);
      setPendingProduct(null);
    }

    setLoading(false);
    onClose();
    window.location.reload();
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: window.location.href });
  };

  const handleClose = () => {
    setPendingProduct(null);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '32px', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '4px' }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <LogIn size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Inicia sesion para continuar</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Para agregar productos al carrito y realizar compras, necesitas iniciar sesion.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--danger-light)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>Correo electronico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="correo@ejemplo.com"
                style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>Contrasena</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}>
            {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
          </button>
        </form>

        <div style={{ margin: '20px 0', position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border)' }} />
          <span style={{ position: 'relative', backgroundColor: 'var(--bg-secondary)', padding: '0 12px', fontSize: '13px', color: 'var(--text-light)' }}>o continua con</span>
        </div>

        <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>No tienes cuenta? </span>
          <button onClick={() => { handleClose(); router.push('/register'); }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Registrate
          </button>
        </div>
      </div>
    </div>
  );
}
