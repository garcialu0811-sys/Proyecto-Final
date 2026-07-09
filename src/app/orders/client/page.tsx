'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Package, Search, ChevronLeft, ChevronRight, Eye,
  Clock, Truck, CheckCircle, XCircle, X, AlertTriangle, MapPin,
  Phone, User, MessageSquare, Calendar, CreditCard, PackageCheck,
  Send, Ban, ChevronDown, ChevronUp, ArrowLeft, FileText,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface OrderItem {
  id: string; productId: string; productName: string; sku?: string;
  price: number; quantity: number; subtotal: number; image?: string;
  description?: string;
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
  EN_RUTA: { label: 'En ruta', color: '#0EA5E9', bg: '#E0F2FE', icon: Truck },
  ENTREGADO: { label: 'Entregado', color: '#059669', bg: '#D1FAE5', icon: CheckCircle },
  CANCELADO: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
};

const TIMELINE_STEPS = [
  { status: 'PENDIENTE', label: 'Pedido recibido', icon: CheckCircle },
  { status: 'PROCESANDO', label: 'En proceso', icon: Package },
  { status: 'EN_RUTA', label: 'En ruta', icon: Truck },
  { status: 'ENTREGADO', label: 'Entregado', icon: MapPin },
];

const STATUS_MESSAGES: Record<string, string> = {
  PENDIENTE: 'Tu pedido ha sido recibido y esta pendiente de confirmacion.',
  PROCESANDO: 'Tu pedido esta siendo preparado por el equipo.',
  EN_RUTA: 'Tu pedido esta en camino! Pronto llegara a tu direccion.',
  ENTREGADO: 'Tu pedido ha sido entregado. Gracias por tu compra!',
  CANCELADO: 'Tu pedido ha sido cancelado.',
};

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}
function formatShortDate(d: string) {
  try { return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function formatCurrency(val: number) {
  return `Q${(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex(s => s.status === status);
  if (idx >= 0) return idx;
  if (status === 'CANCELADO') return -1;
  return 0;
}

export default function ClientOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, inTransit: 0, delivered: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateRange) params.set('dateRange', dateRange);
      const res = await fetch(`/api/orders/client?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || { total: 0, pending: 0, processing: 0, inTransit: 0, delivered: 0, cancelled: 0 });
        setPagination(data.pagination || { total: 0, totalPages: 1, hasNext: false, hasPrev: false });
      }
    } catch { showToast('Error al cargar pedidos.', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, dateRange]);

  useEffect(() => { if (authStatus === 'authenticated') fetchData(); }, [fetchData, authStatus]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateRange]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t); }, [searchInput]);

  const handleCancel = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/client/${selectedOrder.id}/cancel`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: cancelReason || undefined }) });
      if (res.ok) {
        showToast('Pedido cancelado.', 'success');
        setShowCancelModal(false);
        setSelectedOrder(null);
        setCancelReason('');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al cancelar.', 'error');
      }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages; const cp = page;
    if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else { pages.push(1); if (cp > 3) pages.push('...'); for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i); if (cp < tp - 2) pages.push('...'); pages.push(tp); }
    return pages;
  };

  const currentStatusIndex = selectedOrder ? getStatusIndex(selectedOrder.status) : 0;
  const isCancelled = selectedOrder?.status === 'CANCELADO';

  if (authStatus === 'loading') {
    return <div style={{ padding: '80px', textAlign: 'center' }}><div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag size={24} style={{ color: 'var(--accent)' }} /> Mis pedidos
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Consulta el historial de tus pedidos y da seguimiento a sus estados.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* LEFT: Order List */}
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input type="text" className="form-control" placeholder="Buscar pedidos..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ paddingLeft: '36px', height: '42px', width: '100%' }} />
            </div>
            <select className="form-control" style={{ width: '170px', height: '42px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PROCESANDO">En proceso</option>
              <option value="EN_RUTA">En ruta</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <select className="form-control" style={{ width: '170px', height: '42px' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="">Ultimos 6 meses</option>
              <option value="7d">Ultimos 7 dias</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="90d">Ultimos 90 dias</option>
              <option value="180d">Ultimos 6 meses</option>
            </select>
          </div>

          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Pedidos ({pagination.total})
          </p>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <ShoppingBag size={40} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No tienes pedidos aun.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orders.map(order => {
                const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDIENTE;
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px', borderRadius: '12px',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: sc.color }}>
                      <Package size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, margin: 0 }}>#{(order.orderNumber || order.id.slice(-6)).toUpperCase()}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{formatShortDate(order.createdAt)}</p>
                    </div>
                    <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{formatCurrency(order.total || 0)}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{order.quantity} producto{order.quantity !== 1 ? 's' : ''}</p>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, backgroundColor: sc.bg, color: sc.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <sc.icon size={12} /> {sc.label}
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}

          {pagination.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '20px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4 }}><ChevronLeft size={16} /></button>
              {getPageNumbers().map((p, i) => typeof p === 'number' ? <button key={i} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: p === page ? 'var(--accent)' : 'transparent', color: p === page ? '#fff' : 'var(--text-secondary)', fontWeight: p === page ? 700 : 500, fontSize: '13px', cursor: 'pointer' }}>{p}</button> : <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>)}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4 }}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {/* RIGHT: Order Detail */}
        {selectedOrder && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Pedido #{(selectedOrder.orderNumber || selectedOrder.id.slice(-6)).toUpperCase()}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Realizado el {formatDate(selectedOrder.createdAt)}</p>
              </div>
              {(() => {
                const sc = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.PENDIENTE;
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                    <sc.icon size={14} /> {sc.label}
                  </span>
                );
              })()}
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Estado del pedido</h3>
              <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', padding: '0 10px' }}>
                {TIMELINE_STEPS.map((step, idx) => {
                  const isCompleted = !isCancelled && currentStatusIndex >= idx;
                  const isCurrent = !isCancelled && currentStatusIndex === idx;
                  const sc = STATUS_CONFIG[step.status];
                  const historyEntry = selectedOrder.history?.find(h => h.status === step.status);
                  return (
                    <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isCompleted ? (isCurrent ? sc?.color || 'var(--accent)' : '#059669') : '#E5E7EB',
                        color: isCompleted ? '#fff' : '#9CA3AF',
                        border: isCurrent ? `3px solid ${sc?.bg || '#E0F2FE'}` : 'none',
                        transition: 'all 0.3s',
                      }}>
                        {isCompleted ? <CheckCircle size={18} /> : <step.icon size={18} />}
                      </div>
                      <p style={{ fontSize: '11px', fontWeight: isCurrent ? 700 : 500, color: isCompleted ? 'var(--text-primary)' : 'var(--text-light)', marginTop: '8px', textAlign: 'center', margin: '8px 0 0 0' }}>{step.label}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px', textAlign: 'center', margin: '2px 0 0 0' }}>
                        {historyEntry ? formatShortDate(historyEntry.createdAt) : 'Pendiente'}
                      </p>
                    </div>
                  );
                })}
              </div>
              {isCancelled && (
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#FEE2E2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#DC2626' }}>Pedido cancelado</span>
                </div>
              )}
            </div>

            {/* Status message */}
            {!isCancelled && (
              <div style={{ padding: '12px 16px', backgroundColor: STATUS_CONFIG[selectedOrder.status]?.bg || '#f3f4f6', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderLeft: `3px solid ${STATUS_CONFIG[selectedOrder.status]?.color || '#6B7280'}` }}>
                <MessageSquare size={16} style={{ color: STATUS_CONFIG[selectedOrder.status]?.color || '#6B7280', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: STATUS_CONFIG[selectedOrder.status]?.color }}>
                    {selectedOrder.status === 'EN_RUTA' ? 'iTu pedido va en camino!' : STATUS_CONFIG[selectedOrder.status]?.label}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{STATUS_MESSAGES[selectedOrder.status]}</p>
                </div>
              </div>
            )}

            {/* Shipping + Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={14} /> Informacion de envio</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={13} style={{ color: 'var(--text-light)' }} /> {selectedOrder.clientName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={13} style={{ color: 'var(--text-light)' }} /> {selectedOrder.address || selectedOrder.clientAddress || 'Sin direccion'}</div>
                  {(selectedOrder.city || selectedOrder.zone) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={13} style={{ color: 'var(--text-light)' }} /> {selectedOrder.city}{selectedOrder.zone ? `, ${selectedOrder.zone}` : ''}</div>}
                  {(selectedOrder.phone || selectedOrder.clientPhone) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} style={{ color: 'var(--text-light)' }} /> Tel. {selectedOrder.phone || selectedOrder.clientPhone}</div>}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> Resumen del pedido</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal || (selectedOrder.total || 0) - (selectedOrder.shipping || 0))}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Envio</span><span>{formatCurrency(selectedOrder.shipping || 0)}</span></div>
                  {selectedOrder.discount ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Descuento</span><span style={{ color: '#059669' }}>-{formatCurrency(selectedOrder.discount)}</span></div> : null}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total</span><span style={{ color: 'var(--accent)', fontSize: '15px' }}>{formatCurrency(selectedOrder.total || 0)}</span></div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Productos ({selectedOrder.items?.length || 0})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {item.image ? <img src={item.image} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={20} style={{ color: 'var(--text-light)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{item.productName}</p>
                      {item.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
                      <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>Cantidad: {item.quantity}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{formatCurrency(item.subtotal || item.price * item.quantity)}</span>
                  </div>
                )) : (
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={18} style={{ color: 'var(--text-light)' }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{selectedOrder.productName || 'Producto'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Cantidad: {selectedOrder.quantity}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>{formatCurrency(selectedOrder.subtotal || selectedOrder.total || 0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/store')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                <ArrowLeft size={14} /> Volver a comprar
              </button>
              {(selectedOrder.status === 'PENDIENTE' || selectedOrder.status === 'PROCESANDO') && (
                <button onClick={() => setShowCancelModal(true)} className="btn btn-secondary" style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  <Ban size={14} /> Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}><AlertTriangle size={18} /> Cancelar pedido</h2>
              <button onClick={() => { setShowCancelModal(false); setSelectedOrder(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>Estas seguro de cancelar el pedido <strong>#{(selectedOrder.orderNumber || selectedOrder.id.slice(-6)).toUpperCase()}</strong>?</p>
            <p style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '16px', padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '8px' }}>Esta accion no se puede deshacer.</p>
            <div className="form-group">
              <label className="form-label">Motivo (opcional)</label>
              <textarea className="form-control" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Describe el motivo..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => { setShowCancelModal(false); setSelectedOrder(null); }} className="btn btn-secondary" style={{ flex: 1 }}>Volver</button>
              <button onClick={handleCancel} className="btn" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', backgroundColor: 'var(--danger)', color: '#fff' }} disabled={actionLoading}>{actionLoading ? 'Cancelando...' : 'Confirmar cancelacion'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </>
  );
}
