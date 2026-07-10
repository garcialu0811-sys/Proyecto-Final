'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Shield, Save, Bell, Palette, Globe, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const role = currentUser?.role || 'VENDEDOR';

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
      const savedTheme = localStorage.getItem('qrshop-theme') || 'light';
      const savedLang = localStorage.getItem('qrshop-lang') || 'es';
      const savedNotifs = localStorage.getItem('qrshop-notifs');
      setTheme(savedTheme);
      setLanguage(savedLang);
      if (savedNotifs !== null) setEmailNotifs(savedNotifs === 'true');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [session, status, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) { showToast('El nombre es requerido.', 'warning'); return; }
    setProfileLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Perfil actualizado.', 'success');
        await update({ name: profileName });
      } else {
        showToast(data.message || 'Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { showToast('Completa todos los campos.', 'warning'); return; }
    if (newPassword.length < 6) { showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning'); return; }
    if (newPassword !== confirmPassword) { showToast('Las contraseñas no coinciden.', 'warning'); return; }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Contraseña cambiada exitosamente.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || 'Error al cambiar contraseña.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('qrshop-theme', theme);
    localStorage.setItem('qrshop-lang', language);
    localStorage.setItem('qrshop-notifs', String(emailNotifs));
    document.documentElement.setAttribute('data-theme', theme);
    showToast('Preferencias guardadas.', 'success');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('qrshop-theme', newTheme);
  };

  if (status === 'loading') {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const labels = language === 'en'
    ? { editProfile: 'Edit Profile', changePassword: 'Change Password', preferences: 'Preferences', fullName: 'Full Name', email: 'Email', role: 'Role', saveProfile: 'Save Profile', currentPass: 'Current Password', newPass: 'New Password', confirmPass: 'Confirm New Password', changePass: 'Change Password', notifs: 'Email Notifications', activated: 'Activated', deactivated: 'Deactivated', themeLabel: 'Theme', light: 'Light', dark: 'Dark', languageLabel: 'Language', savePrefs: 'Save Preferences', emailCantChange: 'Email cannot be changed.' }
    : { editProfile: 'Editar Perfil', changePassword: 'Cambiar Contraseña', preferences: 'Preferencias', fullName: 'Nombre Completo', email: 'Correo Electrónico', role: 'Rol', saveProfile: 'Guardar Perfil', currentPass: 'Contraseña Actual', newPass: 'Nueva Contraseña', confirmPass: 'Confirmar Nueva Contraseña', changePass: 'Cambiar Contraseña', notifs: 'Notificaciones por Email', activated: 'Activadas', deactivated: 'Desactivadas', themeLabel: 'Tema', light: 'Claro', dark: 'Oscuro', languageLabel: 'Idioma', savePrefs: 'Guardar Preferencias', emailCantChange: 'El correo no se puede cambiar.' };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>{language === 'en' ? 'Account Settings' : 'Configuracion de Cuenta'}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{language === 'en' ? 'Manage your profile, password and preferences.' : 'Gestiona tu perfil, contrasena y preferencias.'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', alignItems: 'start' }}>
        <div className="card">
          <h2 className="card-title" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <span>{labels.editProfile}</span>
            <User size={20} style={{ color: 'var(--accent)' }} />
          </h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">{labels.fullName}</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                <input type="text" className="form-control" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ paddingLeft: '40px' }} disabled={profileLoading} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{labels.email}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                <input type="email" className="form-control" value={profileEmail} disabled style={{ paddingLeft: '40px', opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{labels.emailCantChange}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Shield size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px' }}>{labels.role}: <b className={`role-tag ${role.toLowerCase()}`}>{role}</b></span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '6px' }} disabled={profileLoading}>
              <Save size={16} /> {profileLoading ? (language === 'en' ? 'Saving...' : 'Guardando...') : labels.saveProfile}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <span>{labels.preferences}</span>
            <Palette size={20} style={{ color: 'var(--accent)' }} />
          </h2>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Palette size={14} /> {labels.themeLabel}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleThemeChange('light')} className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '12px' }}>{labels.light}</button>
              <button onClick={() => handleThemeChange('dark')} className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '12px' }}>{labels.dark}</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={14} /> {labels.languageLabel}</label>
            <select className="form-control" value={language} onChange={e => { setLanguage(e.target.value); localStorage.setItem('qrshop-lang', e.target.value); }}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <button onClick={handleSavePreferences} className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '6px' }}>
            <Save size={16} /> {labels.savePrefs}
          </button>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
