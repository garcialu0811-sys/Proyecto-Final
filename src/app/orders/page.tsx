'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Package, Calendar, Truck, CheckCircle, XCircle,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import ClientLayout from '@/components/store/ClientLayout';

interface Order {
  id: string;
  clientName: string;
  clientAddress: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const allOrders: Order[] = data;
        const clientOrders = allOrders.filter(o => o.clientName === user?.name);
        setOrders(clientOrders);
        setPagination(prev => ({
          ...prev,
          total: clientOrders.length,
          totalPages: Math.ceil(clientOrders.length / prev.limit),
          hasNext: page * prev.limit < clientOrders.length,
          hasPrev: page > 1,
        }));
      }
    } catch {
      showToast('Error al cargar pedidos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.name, page]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) fetchOrders();
  }, [session, status, fetchOrders]);

  const filteredOrders = orders.filter(o => {
    const matchSearch = !search || o.productName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginatedOrders = filteredOrders.slice((page - 1) * pagination.limit, page * pagination.limit);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return <Package size={16} style={{ color: 'var(--warning)' }} />;
      case 'PROCESANDO': return <Truck size={16} style={{ color: 'var(--info)' }} />;
      case 'EN_RUTA': return <Truck size={16} style={{ color: 'var(--info)' }} />;
      case 'ENTREGADO': return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'CANCELADO': return <XCircle size={16} style={{ color: 'var(--danger)' }} />;
      default: return <Package size={16} style={{ color: 'var(--text-light)' }} />;
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages;
    const cp = page;
    if (tp <= 5) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else {
      pages.push(1);
      if (cp > 3) pages.push('...');
      for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
      if (cp < tp - 2) pages.push('...');
      pages.push(tp);
    }
    return pages;
  };

  return (
    <ClientLayout title="Mis Pedidos" subtitle="Revisa el estado de tus pedidos realizados.">
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input type="text" className="form-control" placeholder="Buscar por producto o ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '36px', height: '40px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'PENDIENTE', 'PROCESANDO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '50px', whiteSpace: 'nowrap' }}>
                {s === '' ? 'Todos' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando pedidos...</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <ShoppingBag size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay pedidos</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Aun no has realizado ningun pedido.</p>
            <button onClick={() => router.push('/store')} className="btn btn-primary" style={{ marginTop: '16px', padding: '10px 20px' }}>
              Ir a la tienda
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            {paginatedOrders.map(order => (
              <div key={order.id} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{order.productName}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0', fontFamily: 'monospace' }}>#{order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <p style={{ fontWeight: 700, fontSize: '16px', margin: 0, color: 'var(--accent)' }}>Q{order.total.toFixed(2)}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <Calendar size={10} /> {formatDate(order.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '50px', backgroundColor: order.status === 'ENTREGADO' ? 'var(--success-light)' : order.status === 'CANCELADO' ? 'var(--danger-light)' : 'var(--warning-light)' }}>
                  {getStatusIcon(order.status)}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: order.status === 'ENTREGADO' ? 'var(--success)' : order.status === 'CANCELADO' ? 'var(--danger)' : 'var(--warning)' }}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Mostrando {((page - 1) * pagination.limit) + 1} a {Math.min(page * pagination.limit, pagination.total)} de {pagination.total} pedidos
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4 }}>
              <ChevronLeft size={16} />
            </button>
            {getPageNumbers().map((p, i) => typeof p === 'number' ? (
              <button key={i} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: p === page ? 'var(--accent)' : 'transparent', color: p === page ? '#fff' : 'var(--text-secondary)', fontWeight: p === page ? 700 : 500, fontSize: '13px', cursor: 'pointer' }}>{p}</button>
            ) : (
              <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>
            ))}
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}
