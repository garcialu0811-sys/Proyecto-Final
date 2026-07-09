'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Truck, CheckCircle, Navigation, MapPin, User, Package, Clock, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface Order {
  id: string;
  clientName: string;
  clientPhone?: string;
  address: string;
  total: number;
  status: string;
  driverName?: string;
  productName: string;
  quantity: number;
  createdAt: string;
}

export default function DeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'CLIENTE';

  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const allOrders = data.orders || [];
        const filtered = allOrders.filter((o: Order) => o.status === 'EN_RUTA' || o.status === 'ENTREGADO');
        setDeliveries(filtered);
      }
    } catch {
      showToast('Error al cargar entregas.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') {
        showToast('Acceso denegado.', 'error');
        router.push('/');
        return;
      }
      fetchDeliveries();
    }
  }, [session, status]);

  const handleMarkDelivered = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENTREGADO' }),
      });
      if (res.ok) {
        showToast('Entrega completada.', 'success');
        fetchDeliveries();
      } else {
        showToast('Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecallToWarehouse = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESANDO', driverName: null }),
      });
      if (res.ok) {
        showToast('Retornado al almacen.', 'info');
        fetchDeliveries();
      } else {
        showToast('Error al cancelar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const enRutaList = deliveries.filter(d => d.status === 'EN_RUTA');
  const completadasList = deliveries.filter(d => d.status === 'ENTREGADO');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={28} style={{ color: 'var(--accent)' }} />
            Entregas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Monitorea las rutas de reparto y entregas finalizadas.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { title: 'En Transito', value: enRutaList.length, sub: 'Actualmente en ruta', icon: <Truck size={22} style={{ color: 'var(--warning)' }} />, bg: 'var(--warning-light)' },
          { title: 'Completadas', value: completadasList.length, sub: 'Entregas finalizadas', icon: <CheckCircle size={22} style={{ color: 'var(--success)' }} />, bg: 'var(--success-light)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.icon}
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{m.title}</p>
              <p style={{ fontSize: '28px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{m.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando entregas...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={18} style={{ color: 'var(--warning)' }} />
              En Ruta ({enRutaList.length})
            </h2>
            {enRutaList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Truck size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto', display: 'block' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay entregas activas en ruta.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {enRutaList.map(d => (
                  <div key={d.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace', margin: 0 }}>#{d.id.slice(-6).toUpperCase()}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} /> {new Date(d.createdAt).toLocaleDateString('es-GT')}
                        </p>
                      </div>
                      <span className="badge en_ruta" style={{ fontSize: '11px' }}>En ruta</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <MapPin size={14} style={{ color: 'var(--accent)' }} />
                      {d.address}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Cliente: <strong>{d.clientName}</strong> | Repartidor: <strong>{d.driverName || 'Sin asignar'}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {d.productName} x{d.quantity} | <strong>Q{d.total.toFixed(2)}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleMarkDelivered(d.id)} className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '12px', gap: '4px' }} disabled={actionLoading}>
                        <CheckCircle size={14} /> Marcar Entregado
                      </button>
                      <button onClick={() => handleRecallToWarehouse(d.id)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }} disabled={actionLoading}>
                        Retornar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} style={{ color: 'var(--success)' }} />
              Completadas ({completadasList.length})
            </h2>
            {completadasList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Package size={36} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto', display: 'block' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay entregas completadas aun.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completadasList.map(d => (
                  <div key={d.id} style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} style={{ color: 'var(--text-light)' }} /> {d.clientName}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>
                        {d.address} | {d.driverName}
                      </p>
                    </div>
                    <span className="badge entregado" style={{ fontSize: '10px' }}>Entregado</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
