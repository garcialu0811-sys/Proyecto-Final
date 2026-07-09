'use client';

import React, { Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Home, Package, ShoppingBag, Heart,
  LogOut, X,
} from 'lucide-react';

interface ClientSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

const menuSections: { label: string; items: MenuItem[] }[] = [
  {
    label: 'INICIO',
    items: [
      { label: 'Inicio', href: '/store', icon: Home },
      { label: 'Productos', href: '/store?view=products', icon: Package },
    ],
  },
  {
    label: 'COMPRAS',
    items: [
      { label: 'Mis pedidos', href: '/orders', icon: ShoppingBag },
      { label: 'Favoritos', href: '/favoritos', icon: Heart },
    ],
  },
];

function ClientSidebarInner({ isOpen, onClose }: ClientSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = session?.user as any;

  const isActive = (href: string) => {
    const hrefPath = href.split('?')[0];
    const hrefQuery = href.includes('?') ? href.split('?')[1] : '';

    if (pathname !== hrefPath && !pathname.startsWith(hrefPath + '/')) return false;

    if (hrefQuery) {
      const hrefParams = new URLSearchParams(hrefQuery);
      for (const [key, value] of hrefParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }

    return !searchParams.toString();
  };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'none' }}
          className="sidebar-overlay" />
      )}

      <aside style={{
        width: '260px', minHeight: '100vh', backgroundColor: '#0f1724',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        zIndex: 151, transition: 'transform 0.3s ease',
        overflowY: 'auto', overflowX: 'hidden',
      }} className={`client-sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Variedades Coatán" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>Variedades</span>
              <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--accent)' }}>Coatán</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'none' }} className="sidebar-close-btn">
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '12px 10px' }}>
          {menuSections.map((section) => (
            <div key={section.label} style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '8px 14px 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.label}
                    onClick={() => { router.push(item.href); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                      padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      fontSize: '14px', fontWeight: active ? 600 : 400, textAlign: 'left',
                      backgroundColor: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'rgba(226,232,240,0.7)',
                      transition: 'all 0.15s', marginBottom: '2px',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {session && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/store' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <LogOut size={16} />
            </button>
          </div>
        )}

        <style jsx global>{`
          .client-sidebar { transform: translateX(0); }
          @media (max-width: 1024px) {
            .client-sidebar { transform: translateX(-100%) !important; }
            .client-sidebar.open { transform: translateX(0) !important; }
            .sidebar-overlay { display: block !important; }
            .sidebar-close-btn { display: block !important; }
          }
        `}</style>
      </aside>
    </>
  );
}

export default function ClientSidebar(props: ClientSidebarProps) {
  return (
    <Suspense fallback={null}>
      <ClientSidebarInner {...props} />
    </Suspense>
  );
}
