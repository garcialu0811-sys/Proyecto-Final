'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FolderOpen,
  ClipboardList,
  Camera,
  DollarSign,
  ShoppingCart,
  Truck,
  Users,
  ShieldCheck,
  FileText,
  Receipt,
  Settings,
  LogOut,
  QrCode,
  Bell,
  PlusCircle,
  History,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  const groups: MenuGroup[] = [
    {
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'VENDEDOR']
        }
      ]
    },
    {
      title: 'INVENTARIO',
      items: [
        {
          name: 'Productos',
          path: '/products',
          icon: ShoppingBag,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Categorías',
          path: '/categories',
          icon: FolderOpen,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Inventario',
          path: '/inventory',
          icon: ClipboardList,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Escanear QR',
          path: '/scan',
          icon: Camera,
          roles: ['ADMIN', 'VENDEDOR']
        }
      ]
    },
    {
      title: 'VENTAS',
      items: [
        {
          name: 'Nueva Venta',
          path: '/sales/new',
          icon: PlusCircle,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Historial de Ventas',
          path: '/sales/history',
          icon: History,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Recibos',
          path: '/sales/receipts',
          icon: Receipt,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Entregas',
          path: '/deliveries',
          icon: Truck,
          roles: ['ADMIN', 'VENDEDOR']
        }
      ]
    },
    {
      title: 'USUARIOS',
      items: [
        {
          name: 'Usuarios',
          path: '/users',
          icon: Users,
          roles: ['ADMIN']
        },
        {
          name: 'Roles',
          path: '/roles',
          icon: ShieldCheck,
          roles: ['ADMIN']
        }
      ]
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        {
          name: 'Notificaciones',
          path: '/settings/notifications',
          icon: Bell,
          roles: ['ADMIN']
        },
        {
          name: 'Ajustes',
          path: '/settings',
          icon: Settings,
          roles: ['ADMIN', 'VENDEDOR']
        },
        {
          name: 'Ajustes',
          path: '/profile',
          icon: Settings,
          roles: ['VENDEDOR']
        }
      ]
    }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo" style={{ flexDirection: collapsed ? 'column' : 'row', gap: collapsed ? '4px' : '10px', alignItems: 'center' }}>
        <img src="/logo.png" alt="Variedades Coatán" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, opacity: 1, transition: 'opacity 0.2s ease' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Variedades</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.3px' }}>Coatán</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, marginTop: '12px', paddingBottom: '24px' }}>
        {groups.map((group, gIdx) => {
          const filteredItems = group.items.filter(item => item.roles.includes(role));
          if (filteredItems.length === 0) return null;

          return (
            <div key={gIdx} style={{ marginBottom: '8px' }}>
              {group.title && !collapsed && (
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  color: 'rgba(255, 255, 255, 0.3)', 
                  padding: '12px 14px 6px 14px', 
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase'
                }}>
                  {group.title}
                </div>
              )}
              <ul className="sidebar-menu">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.path);

                  return (
                    <li key={item.path}>
                      <Link 
                        href={item.path} 
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={18} />
                        <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {session && (
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-footer-info" style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', marginBottom: '4px' }}>
                {user?.email}
              </p>
              <span className={`role-tag ${role.toLowerCase()}`}>
                {role}
              </span>
            </div>
          )}
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="toggle-btn"
            title="Cerrar Sesión"
            style={{ color: 'var(--danger)', marginLeft: collapsed ? '0' : 'auto' }}
          >
            <LogOut size={20} />
          </button>
        </div>
      )}
    </aside>
  );
}
