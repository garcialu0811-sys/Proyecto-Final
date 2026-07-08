'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, MessageSquare, Menu, ChevronDown, LogOut, Settings } from 'lucide-react';
import ClientSidebar from '@/components/store/ClientSidebar';
import { useCartStore } from '@/lib/store/cartStore';

interface ClientLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function ClientLayout({ children, title, subtitle, headerRight }: ClientLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const totalItems = useCartStore(s => s.getTotalItems());
  const setCartOpen = useCartStore(s => s.setOpen);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-area">
        <header style={{ height: '64px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'none' }} className="hamburger-btn">
            <Menu size={22} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => router.push('/forum')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <MessageSquare size={18} /> Foro
            </button>

            <button onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <ShoppingCart size={18} /> Carrito
              {totalItems > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{totalItems}</span>
              )}
            </button>

            {session ? (
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>Cliente</p>
                  </div>
                  <ChevronDown size={14} style={{ color: 'var(--text-light)', transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
                </button>

                {profileOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '200px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px', zIndex: 200 }}>
                    <button onClick={() => { router.push('/profile'); setProfileOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Settings size={16} style={{ color: 'var(--text-secondary)' }} /> Ajustes
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                    <button onClick={() => signOut({ callbackUrl: '/store' })} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--danger)', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <LogOut size={16} /> Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => signIn()} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> Iniciar sesion
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {(title || subtitle) && (
            <div style={{ marginBottom: '24px' }}>
              {title && <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: subtitle ? '4px' : 0 }}>{title}</h1>}
              {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{subtitle}</p>}
            </div>
          )}
          {headerRight && <div style={{ marginBottom: '24px' }}>{headerRight}</div>}
          {children}
        </div>
      </div>

      <style jsx global>{`
        .hamburger-btn { display: none !important; }
        @media (max-width: 1024px) {
          .main-area { margin-left: 0 !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
