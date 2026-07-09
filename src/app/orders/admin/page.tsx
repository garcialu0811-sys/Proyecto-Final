'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Package, Search, Filter, Download, RefreshCw,
  ChevronLeft, ChevronRight, Eye, Edit3, Trash2, X, Clock, Truck,
  CheckCircle, XCircle, MapPin, Phone, User, BarChart3,
  FileText, AlertTriangle, ShoppingCart,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface OrderItem {
  id: string; productId: string; productName: string; sku?: string;
  price: number; quantity: number; subtotal: number; image?: string;
}
interface OrderHistoryEntry { id: string; status: string; note?: string; createdAt: string; }
interface Order {
  id: string; orderNumber: string; userId?: string; clientName: string;
  clientPhone?: string; clientAddress?: string; phone?: string; address?: string;
  city?: string; zone?: string; reference?: string; productName: string;
  quantity: number; price: number; subtotal?: number; shipping?: number;
  discount?: number; total: number; status: string; paymentMethod?: string;
  notes?: string; createdAt: string; updatedAt: string; items: OrderItem[];
  history: OrderHistoryEntry[]; driverId?: string; driverName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDIENTE: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  PROCESANDO: { label: 'En proceso', color: '#2563EB', bg: '#DBEAFE', icon: Package },
  EN_RUTA: { label: 'Enviado', color: '#7C3AED', bg: '#EDE9FE', icon: Truck },
  ENTREGADO: { label: 'Completado', color: '#059669', bg: '#D1FAE5', icon: CheckCircle },
  CANCELADO: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
};

const DELIVERY_CONFIG: Record<string, { label: string; icon: any }> = {
  PENDIENTE: { label: 'Pendiente', icon: Clock },
  PROCESANDO: { label: 'Entrega a domicilio', icon: Truck },
  EN_RUTA: { label: 'En camino', icon: Truck },
  ENTREGADO: { label: 'Entregado', icon: CheckCircle },
  CANCELADO: { label: 'Cancelada', icon: XCircle },
};

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}
function formatCurrency(val: number) {
  return `Q${(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
    else if (authStatus === 'authenticated' && user?.role === 'CLIENTE') router.push('/orders/client');
  }, [authStatus, user, router]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, inTransit: 0, delivered: 0, cancelled: 0, totalRevenue: 0, avgOrder: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateRange) params.set('dateRange', dateRange);
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || { total: 0, pending: 0, processing: 0, inTransit: 0, delivered: 0, cancelled: 0, totalRevenue: 0, avgOrder: 0 });
        setPagination(data.pagination || { total: 0, totalPages: 1, hasNext: false, hasPrev: false });
      }
    } catch { showToast('Error al cargar pedidos.', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, dateRange]);

  useEffect(() => { if (authStatus === 'authenticated' && user?.role !== 'CLIENTE') fetchData(); }, [fetchData, authStatus, user]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateRange]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t); }, [searchInput]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) { showToast('Estado actualizado.', 'success'); setShowStatusModal(false); setSelectedOrder(null); setNewStatus(''); setStatusNote(''); fetchData(); }
      else { const data = await res.json(); showToast(data.message || 'Error al actualizar.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Pedido eliminado.', 'success'); setShowDeleteModal(false); setSelectedOrder(null); fetchData(); }
      else { const data = await res.json(); showToast(data.message || 'Error al eliminar.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleExport = () => {
    const headers = ['ID', 'Fecha', 'Cliente', 'Productos', 'Total', 'Estado'];
    const rows = orders.map(o => [`#${(o.orderNumber || o.id.slice(-6)).toUpperCase()}`, new Date(o.createdAt).toLocaleDateString('es-GT'), o.clientName, o.productName, `Q${(o.total || 0).toFixed(2)}`, STATUS_CONFIG[o.status]?.label || o.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    showToast('CSV exportado.', 'success');
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages; const cp = page;
    if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else { pages.push(1); if (cp > 3) pages.push('...'); for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i); if (cp < tp - 2) pages.push('...'); pages.push(tp); }
    return pages;
  };

  if (authStatus === 'loading' || (authStatus === 'authenticated' && user?.role === 'CLIENTE')) {
    return <div style={{ padding: '80px', textAlign: 'center' }}><div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}><ShoppingBag size={24} style={{ color: 'var(--accent)' }} /> Pedidos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Gestione y da seguimiento a todos los pedidos de tu negocio.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowStatsModal(true)} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><BarChart3 size={16} /> Estadisticas</button>
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Download size={16} /> Exportar</button>
          <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><RefreshCw size={16} /> Actualizar</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { title: 'Total pedidos', value: stats.total, icon: <ShoppingBag size={20} />, color: 'var(--accent)', bg: 'var(--accent-light)' },
          { title: 'Pendientes', value: stats.pending, icon: <Clock size={20} />, color: '#D97706', bg: '#FEF3C7' },
          { title: 'Envios', value: stats.inTransit, icon: <Truck size={20} />, color: '#7C3AED', bg: '#EDE9FE' },
          { title: 'Completados', value: stats.delivered, icon: <CheckCircle size={20} />, color: '#059669', bg: '#D1FAE5' },
        ].map((m, i) => (
          <div key={i} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: m.color }}>{m.icon}</div>
            <div><p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{m.title}</p><p style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 0 0', color: m.color }}>{m.value}</p></div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}><Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} /><input type="text" className="form-control" placeholder="Buscar pedidos..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ paddingLeft: '36px', height: '40px' }} /></div>
          <select className="form-control" style={{ width: '180px', height: '40px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="PROCESANDO">En proceso</option><option value="EN_RUTA">Enviado</option><option value="ENTREGADO">Completado</option><option value="CANCELADO">Cancelado</option>
          </select>
          <select className="form-control" style={{ width: '180px', height: '40px' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="">Todas las fechas</option><option value="7d">Ultimos 7 dias</option><option value="30d">Ultimos 30 dias</option><option value="90d">Ultimos 90 dias</option>
          </select>
          <button className="btn btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '40px' }}><Filter size={16} /> Filtros</button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>Mostrando {orders.length} de {pagination.total} pedidos</p>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><ShoppingBag size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} /><h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay pedidos</h3><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No se encontraron pedidos con los filtros aplicados.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>{['ID Pedido', 'Fecha', 'Cliente', 'Productos', 'Total', 'Estado', 'Entrega', 'Acciones'].map(h => (<th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDIENTE;
                  const dc = DELIVERY_CONFIG[order.status] || DELIVERY_CONFIG.PENDIENTE;
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>#{(order.orderNumber || order.id.slice(-6)).toUpperCase()}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 500 }}>{order.clientName}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{order.quantity} producto{order.quantity !== 1 ? 's' : ''}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(order.total || 0)}</td>
                      <td style={{ padding: '14px 16px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}><sc.icon size={14} /> {sc.label}</span></td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><dc.icon size={14} style={{ color: 'var(--text-light)' }} /> {dc.label}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> Ver</button>
                          <button onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setShowStatusModal(true); }} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}><Edit3 size={14} /></button>
                          {role === 'ADMIN' && <button onClick={() => { setSelectedOrder(order); setShowDeleteModal(true); }} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--danger)' }}><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, pagination.total)} de {pagination.total} pedidos</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4 }}><ChevronLeft size={16} /></button>
              {getPageNumbers().map((p, i) => typeof p === 'number' ? <button key={i} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: p === page ? 'var(--accent)' : 'transparent', color: p === page ? '#fff' : 'var(--text-secondary)', fontWeight: p === page ? 700 : 500, fontSize: '13px', cursor: 'pointer' }}>{p}</button> : <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>)}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4 }}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showDetailModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> Detalle del Pedido #{(selectedOrder.orderNumber || selectedOrder.id.slice(-6)).toUpperCase()}</h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShoppingCart size={16} /> Informacion del pedido</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <p><strong>Cliente:</strong> {selectedOrder.clientName}</p>
                <p><strong>Fecha:</strong> {formatDate(selectedOrder.createdAt)}</p>
                <p><strong>Estado:</strong> <span style={{ color: STATUS_CONFIG[selectedOrder.status]?.color }}>{STATUS_CONFIG[selectedOrder.status]?.label}</span></p>
                {selectedOrder.clientPhone && <p><strong>Telefono:</strong> {selectedOrder.clientPhone}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button onClick={() => { setShowDetailModal(false); setNewStatus(selectedOrder.status); setShowStatusModal(true); }} className="btn btn-primary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><RefreshCw size={14} /> Cambiar estado</button>
              {role === 'ADMIN' && <button onClick={() => { setShowDetailModal(false); setShowDeleteModal(true); }} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--danger)' }}><Trash2 size={14} /> Eliminar</button>}
            </div>
          </div>
        </div>
      )}

      {showStatusModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '450px', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={18} /> Cambiar estado</h2><button onClick={() => { setShowStatusModal(false); setSelectedOrder(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button></div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Pedido: <strong>#{(selectedOrder.orderNumber || selectedOrder.id.slice(-6)).toUpperCase()}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: newStatus === key ? `2px solid ${cfg.color}` : '1px solid var(--border)', cursor: 'pointer', backgroundColor: newStatus === key ? cfg.bg : 'transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="status" value={key} checked={newStatus === key} onChange={() => setNewStatus(key)} style={{ accentColor: cfg.color }} />
                  <cfg.icon size={16} style={{ color: cfg.color }} />
                  <span style={{ fontSize: '13px', fontWeight: newStatus === key ? 600 : 400 }}>{cfg.label}</span>
                </label>
              ))}
            </div>
            <div className="form-group"><label className="form-label">Nota (opcional)</label><textarea className="form-control" rows={2} value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Agregar una nota sobre el cambio..." style={{ resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => { setShowStatusModal(false); setSelectedOrder(null); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleUpdateStatus} className="btn btn-primary" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }} disabled={actionLoading || !newStatus}>{actionLoading ? 'Actualizando...' : 'Actualizar estado'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}><AlertTriangle size={18} /> Eliminar pedido</h2><button onClick={() => { setShowDeleteModal(false); setSelectedOrder(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button></div>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>Estas seguro de eliminar el pedido <strong>#{(selectedOrder.orderNumber || selectedOrder.id.slice(-6)).toUpperCase()}</strong>?</p>
            <p style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '20px', padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '8px' }}>Esta accion no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowDeleteModal(false); setSelectedOrder(null); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleDelete} className="btn" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', backgroundColor: 'var(--danger)', color: '#fff' }} disabled={actionLoading}>{actionLoading ? 'Eliminando...' : 'Eliminar pedido'}</button>
            </div>
          </div>
        </div>
      )}

      {showStatsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} /> Estadisticas</h2><button onClick={() => setShowStatsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {[{ label: 'Total', value: stats.total, color: 'var(--accent)' }, { label: 'Pendientes', value: stats.pending, color: '#D97706' }, { label: 'Enviados', value: stats.inTransit, color: '#7C3AED' }, { label: 'Completados', value: stats.delivered, color: '#059669' }, { label: 'Cancelados', value: stats.cancelled, color: '#DC2626' }].map((m, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}><p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{m.label}</p><p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0 0', color: m.color }}>{m.value}</p></div>
              ))}
            </div>
            <button onClick={() => setShowStatsModal(false)} className="btn btn-primary">Cerrar</button>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </>
  );
}
