'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Sun, Moon, LogIn, Bell, AlertTriangle, Info, Settings, LogOut, ChevronDown, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface Notification {
  id: string;
  type: 'warning' | 'info';
  message: string;
  createdAt: string;
}

export function Header({ collapsed, setCollapsed }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    document.documentElement.setAttribute('data-theme', initialTheme);
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  const fetchNotifications = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearNotifications = () => {
    setNotifications([]);
    setShowNotifDropdown(false);
    localStorage.setItem('notifications_cleared', 'true');
  };

  const user = session?.user as any;
  const roleText = user?.role === 'ADMIN' ? 'Administrador' : 'Vendedor';

  return (
    <header className="header">
      <div className="header-left">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="toggle-btn"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="header-right">
        {/* Cambiar Tema */}
        <button
          onClick={toggleTheme}
          className="toggle-btn"
          title={theme === 'light' ? "Modo Oscuro" : "Modo Claro"}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {session ? (
          <>
            {/* Campana de Notificación */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <div
                className="notification-bell-box toggle-btn"
                onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }}
                title="Notificaciones"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="bell-badge">{notifications.length}</span>
                )}
              </div>

              {showNotifDropdown && (
                <div className="notifications-dropdown">
                  <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Alertas del Sistema</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--text-light)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                        No hay alertas o stock crítico.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className={`notification-item ${notif.type}`}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            {notif.type === 'warning' ? (
                              <AlertTriangle size={14} style={{ color: 'var(--warning)', marginTop: '2px', flexShrink: 0 }} />
                            ) : (
                              <Info size={14} style={{ color: 'var(--info)', marginTop: '2px', flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: '11px', fontWeight: 500 }}>{notif.message}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Link
                    href="/settings/notifications"
                    onClick={() => setShowNotifDropdown(false)}
                    style={{
                      display: 'block', textAlign: 'center', marginTop: '10px', padding: '8px',
                      background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px',
                      fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
                      border: '1px solid var(--border)'
                    }}
                  >
                    Configurar Notificaciones
                  </Link>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div ref={userRef} style={{ position: 'relative' }}>
              <div
                className="header-user-avatar-group"
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="header-avatar-circle">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="header-user-details">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">{roleText}</span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', marginLeft: '4px', transition: 'transform 0.2s', transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
              </div>

              {showUserDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  minWidth: '200px', zIndex: 100, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user?.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{user?.email}</p>
                  </div>

                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={() => { router.push('/profile'); setShowUserDropdown(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', border: 'none', background: 'transparent',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--text-primary)', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={16} style={{ color: 'var(--text-secondary)' }} />
                      Mi Perfil
                    </button>

                    <button
                      onClick={() => { router.push('/settings/notifications'); setShowUserDropdown(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', border: 'none', background: 'transparent',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--text-primary)', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
                      Notificaciones
                    </button>
                  </div>

                  <div style={{ padding: '6px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', border: 'none', background: 'transparent',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--danger)', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ padding: '6px 14px', borderRadius: '50px' }}>
            <LogIn size={16} />
            <span>Ingresar</span>
          </Link>
        )}
      </div>
    </header>
  );
}
