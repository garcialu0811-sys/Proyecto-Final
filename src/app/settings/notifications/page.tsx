'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Bell, Send, MessageCircle, AlertTriangle, CheckCircle,
  Save, RefreshCw, Shield,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function NotificationSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;

  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settings, setSettings] = useState({
    lowStockAlerts: true,
    lowStockThreshold: 5,
    newOrderAlerts: true,
    sendToTelegram: true,
    sendToEmail: false,
    telegramChatId: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && user?.role !== 'ADMIN') {
      showToast('Acceso restringido.', 'error');
      router.push('/dashboard');
    }
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetchSettings();
    }
  }, [session, status]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/notifications');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      showToast('Error al cargar configuracion.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast('Configuracion guardada.', 'success');
      } else {
        showToast('Error al guardar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/telegram/test');
      const data = await res.json();
      if (data.success) {
        showToast('Mensaje de prueba enviado! Revisa Telegram.', 'success');
      } else {
        showToast(data.error || 'Error al enviar prueba.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={24} style={{ color: 'var(--accent)' }} /> Notificaciones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Configura alertas de stock bajo y notificaciones via Telegram.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleTest} disabled={testLoading} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            {testLoading ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
            Probar
          </button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            {loading ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Telegram Status */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid #10B981' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MessageCircle size={22} style={{ color: '#10B981', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px' }}>Conexion con Telegram</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {settings.telegramChatId
                ? `Conectado - Chat ID: ${settings.telegramChatId}`
                : 'No configurado. Envia /start al bot en Telegram para vincular.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} style={{ color: '#F59E0B' }} /> Alertas de Stock
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p style={{ fontWeight: 500, fontSize: '14px' }}>Alertas de stock bajo</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recibir alertas cuando el stock este por debajo del umbral</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, lowStockAlerts: !settings.lowStockAlerts })}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: settings.lowStockAlerts ? '#D1FAE5' : '#F3F4F6', color: settings.lowStockAlerts ? '#059669' : '#6B7280' }}
            >
              {settings.lowStockAlerts ? 'Activado' : 'Desactivado'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Umbral minimo:</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 5 })}
              className="form-control"
              style={{ width: '80px', padding: '6px 10px', fontSize: '13px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>unidades</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px' }}>Alertas de nuevos pedidos</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recibir alertas cuando se cree un nuevo pedido</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, newOrderAlerts: !settings.newOrderAlerts })}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: settings.newOrderAlerts ? '#D1FAE5' : '#F3F4F6', color: settings.newOrderAlerts ? '#059669' : '#6B7280' }}
          >
            {settings.newOrderAlerts ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>

      {/* Channels */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} style={{ color: 'var(--accent)' }} /> Canales de Notificacion
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px' }}>Telegram</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recibir notificaciones via Telegram</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, sendToTelegram: !settings.sendToTelegram })}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: settings.sendToTelegram ? '#D1FAE5' : '#F3F4F6', color: settings.sendToTelegram ? '#059669' : '#6B7280' }}
          >
            {settings.sendToTelegram ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px' }}>Email</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recibir notificaciones por correo (proximo)</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, sendToEmail: !settings.sendToEmail })}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: settings.sendToEmail ? '#D1FAE5' : '#F3F4F6', color: settings.sendToEmail ? '#059669' : '#6B7280' }}
          >
            {settings.sendToEmail ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Como configurar Telegram</h4>
        <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.8 }}>
          <li>Busca <strong>@QRShopAlertasBot</strong> en Telegram</li>
          <li>Envia <strong>/start</strong> para iniciar la conversacion</li>
          <li>El bot vinculara tu cuenta automaticamente</li>
          <li>Recibiras un mensaje de confirmacion</li>
          <li>Listo! Recibiras notificaciones automaticamente</li>
        </ol>
      </div>

      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
