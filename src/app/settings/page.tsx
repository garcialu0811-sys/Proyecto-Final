'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Settings, Save, Bell, Shield, Globe, Palette, User, Mail, Phone,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const role = currentUser?.role || 'VENDEDOR';

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('es');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') { showToast('Acceso denegado.', 'error'); router.push('/'); return; }
      setName(currentUser?.name || '');
      setEmail(currentUser?.email || '');
    }
  }, [session, status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        showToast('Configuracion guardada.', 'success');
      } else {
        showToast('Error al guardar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Settings size={28} style={{ color: 'var(--accent)' }} />
          Ajustes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: '4px 0 0 0' }}>
          Configura las preferencias de tu cuenta y del sistema.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--accent)' }} /> Informacion Personal
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} disabled={saving} />
            </div>
            <div className="form-group">
              <label className="form-label">Correo electronico</label>
              <input type="email" className="form-control" value={email} disabled style={{ opacity: 0.6 }} />
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>El email no se puede modificar.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Telefono</label>
              <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="5555-1234" disabled={saving} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: 'var(--accent)' }} /> Notificaciones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Notificaciones por email</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Recibe alertas de pedidos y ventas</p>
              </div>
              <button onClick={() => setNotifications(!notifications)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: notifications ? '#10B981' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: notifications ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={18} style={{ color: 'var(--accent)' }} /> Apariencia
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Modo oscuro</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Cambia el tema de la interfaz</p>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: darkMode ? '#10B981' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: darkMode ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} style={{ color: 'var(--accent)' }} /> Idioma
          </h3>
          <div className="form-group">
            <select className="form-control" value={language} onChange={e => setLanguage(e.target.value)} disabled={saving}>
              <option value="es">Espanol</option>
              <option value="en">Ingles</option>
            </select>
          </div>
        </div>

        {role === 'ADMIN' && (
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: 'var(--accent)' }} /> Seguridad
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0' }}>Sesion activa</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Conectado como <strong>{currentUser?.email}</strong></p>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0' }}>Rol</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}><strong>{role === 'ADMIN' ? 'Administrador' : 'Vendedor'}</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', borderRadius: '8px', fontWeight: 600 }}>
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
