'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Menu, Sun, Moon, LogIn, Bell, Settings, Search, AlertTriangle, Info } from 'lucide-react';

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Obtener notificaciones desde la API
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
      // Consultar de forma síncrona cada 30 segundos
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Cerrar al hacer clic fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearNotifications = () => {
    setNotifications([]);
    setShowDropdown(false);
    localStorage.setItem('notifications_cleared', 'true');
  };

  const user = session?.user as any;
  const roleText = user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'VENDEDOR' ? 'Vendedor' : 'Cliente';

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

      {/* Barra de búsqueda superior en escritorio */}
      <div className="header-search-container">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar productos, pedidos, usuarios..." 
          className="header-search-input"
        />
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
            {/* Campana de Notificación con Badge */}
            <div 
              ref={dropdownRef}
              style={{ position: 'relative' }}
            >
              <div 
                className="notification-bell-box toggle-btn" 
                onClick={() => setShowDropdown(!showDropdown)}
                title="Notificaciones"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="bell-badge">{notifications.length}</span>
                )}
              </div>

              {/* Menu Desplegable de Notificaciones */}
              {showDropdown && (
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
                </div>
              )}
            </div>

            {/* Gear de Ajustes */}
            <Link href="/profile" className="toggle-btn" title="Ajustes de Perfil">
              <Settings size={18} />
            </Link>

            {/* Info y Avatar de Usuario */}
            <div className="header-user-avatar-group">
              <div className="header-avatar-circle">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="header-user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{roleText}</span>
              </div>
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
