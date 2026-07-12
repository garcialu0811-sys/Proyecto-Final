'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Package, Search, Download, RefreshCw, FileText, Plus, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ArrowRight, TrendingUp, TrendingDown, AlertTriangle,
  X, Save, MapPin, DollarSign, ShoppingCart, BarChart3, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  sku: string;
  isActive: boolean;
  imageUrl: string;
  qrCode: string;
  costPrice: number;
  location: {
    warehouse: string;
    aisle: string;
    shelf: string;
  };
  createdAt: string;
}

interface Movement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface Metrics {
  totalValue: number;
  totalCostValue: number;
  totalProducts: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  movementsToday: number;
}

interface CategoryData {
  name: string;
  value: number;
  costValue: number;
  count: number;
  percentage: number;
}

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  const [modal, setModal] = useState<'view' | 'edit' | 'delete' | 'report' | 'movement' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<Movement[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Edit form
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editWarehouse, setEditWarehouse] = useState('');
  const [editAisle, setEditAisle] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');

  // Movement form
  const [movProductId, setMovProductId] = useState('');
  const [movType, setMovType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [movQuantity, setMovQuantity] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movReference, setMovReference] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (stockFilter) params.set('stock', stockFilter);
      if (locationFilter) params.set('location', locationFilter);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setMetrics(data.metrics);
        setCategories(data.categories);
        setLocations(data.locations);
        setProductCategories(data.productCategories);
        setLowStockProducts(data.lowStockProducts);
        setRecentMovements(data.recentMovements);
        setPagination(data.pagination);
      }
    } catch {
      showToast('Error al cargar inventario.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, stockFilter, locationFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') {
        showToast('Acceso denegado.', 'error');
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [session, status]);

  useEffect(() => { fetchData(); }, [page, search, categoryFilter, stockFilter, locationFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openView = async (p: Product) => {
    setSelectedProduct(p);
    try {
      const res = await fetch(`/api/inventory/movement?productId=${p.id}`);
      if (res.ok) setProductMovements(await res.json());
    } catch {}
    setModal('view');
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setEditStock(p.stock.toString());
    setEditMinStock((p.minStock || 5).toString());
    setEditWarehouse(p.location?.warehouse || '');
    setEditAisle(p.location?.aisle || '');
    setEditShelf(p.location?.shelf || '');
    setEditPrice(p.price.toString());
    setEditCostPrice((p.costPrice || 0).toString());
    setModal('edit');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: Number(editStock),
          minStock: Number(editMinStock),
          price: Number(editPrice),
          costPrice: Number(editCostPrice),
          location: {
            warehouse: editWarehouse,
            aisle: editAisle,
            shelf: editShelf,
          },
        }),
      });
      if (res.ok) {
        showToast('Inventario actualizado.', 'success');
        setModal(null);
        fetchData();
      } else {
        showToast('Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Producto eliminado.', 'success');
        setModal(null);
        fetchData();
      } else {
        showToast('Error al eliminar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movProductId || !movQuantity) { showToast('Completa los campos.', 'warning'); return; }
    setFormLoading(true);
    try {
      const res = await fetch('/api/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: movProductId,
          type: movType,
          quantity: Number(movQuantity),
          reason: movReason,
          reference: movReference,
          userId: user.id,
          userName: user.name,
        }),
      });
      if (res.ok) {
        showToast('Movimiento registrado.', 'success');
        setModal(null);
        setMovProductId(''); setMovQuantity(''); setMovReason(''); setMovReference('');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al registrar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Producto', 'SKU', 'Categoria', 'Ubicacion', 'Stock', 'Stock Minimo', 'Estado', 'Precio', 'Costo', 'Valor Inventario'];
    const rows = products.map(p => [
      `"${p.name}"`,
      p.sku,
      p.category,
      `"${p.location?.warehouse || ''} ${p.location?.aisle || ''} ${p.location?.shelf || ''}"`,
      p.stock,
      p.minStock || 5,
      getStockStatus(p.stock, p.minStock || 5).label,
      p.price.toFixed(2),
      (p.costPrice || 0).toFixed(2),
      (p.price * p.stock).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario-variedades-coatan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Inventario exportado.', 'success');
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Sin stock', color: 'var(--danger)', bg: 'var(--danger-light)', icon: '⚪' };
    if (stock <= minStock) return { label: 'Bajo', color: 'var(--warning)', bg: 'var(--warning-light)', icon: '🟡' };
    return { label: 'Optimo', color: 'var(--success)', bg: 'var(--success-light)', icon: '🟢' };
  };

  const formatLocation = (loc: any) => {
    if (!loc) return '-';
    const parts = [loc.warehouse, loc.aisle, loc.shelf].filter(Boolean);
    return parts.join(', ') || '-';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Hace minutos';
    if (hours < 24) return `Hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} dia${days > 1 ? 's' : ''}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages;
    const cp = pagination.page;
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

  const formatCurrency = (val: number) => {
    return `Q${val.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} style={{ color: 'var(--accent)' }} />
            Inventario
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Controla el stock, movimientos y ubicaciones de tus productos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setModal('report')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', fontWeight: 500 }}>
            <FileText size={18} />
            Reporte de inventario
          </button>
          <button onClick={() => setModal('movement')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            <Plus size={18} />
            Movimiento
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { title: 'Valor total del inventario', value: formatCurrency(metrics.totalValue), sub: 'Valor de costo', icon: <DollarSign size={22} style={{ color: 'var(--accent)' }} />, bg: 'var(--accent-light)' },
            { title: 'Total de productos', value: metrics.totalProducts, sub: 'Productos en inventario', icon: <Package size={22} style={{ color: 'var(--success)' }} />, bg: 'var(--success-light)' },
            { title: 'Stock total', value: metrics.totalUnits, sub: 'Unidades disponibles', icon: <Package size={22} style={{ color: 'var(--info)' }} />, bg: 'var(--info-light)' },
            { title: 'Stock bajo', value: metrics.lowStock, sub: 'Productos', icon: <AlertTriangle size={22} style={{ color: 'var(--warning)' }} />, bg: 'var(--warning-light)' },
            { title: 'Movimientos hoy', value: metrics.movementsToday, sub: 'Entradas y salidas', icon: <ArrowUpDown size={22} style={{ color: '#8B5CF6' }} />, bg: 'rgba(139,92,246,0.1)' },
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
      )}

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input type="text" className="form-control" placeholder="Buscar productos..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ paddingLeft: '36px' }} />
        </div>
        <select className="form-control" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} style={{ width: '150px', flexShrink: 0 }}>
          <option value="">Categoria</option>
          {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }} style={{ width: '130px', flexShrink: 0 }}>
          <option value="">Stock</option>
          <option value="optimal">Optimo</option>
          <option value="low">Bajo</option>
          <option value="out">Sin stock</option>
        </select>
        <select className="form-control" value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(1); }} style={{ width: '140px', flexShrink: 0 }}>
          <option value="">Ubicacion</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {pagination.total} productos
        </span>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando inventario...</p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Package size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay productos</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No se encontraron productos con los filtros seleccionados.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SKU</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock disponible</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock minimo</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor de inventario</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const stockStatus = getStockStatus(p.stock, p.minStock || 5);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={20} style={{ color: 'var(--text-light)' }} />}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{p.name}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.sku}</td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{p.category}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: stockStatus.color }}>{p.stock} unidades</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{p.minStock || 5} unidades</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 600, backgroundColor: stockStatus.bg, color: stockStatus.color }}>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(p.price * p.stock)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)', gap: '4px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4 }}>
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p, i) => typeof p === 'number' ? (
                <button key={i} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: p === pagination.page ? 'var(--accent)' : 'transparent', color: p === pagination.page ? '#fff' : 'var(--text-secondary)', fontWeight: p === pagination.page ? 700 : 500, fontSize: '13px', cursor: 'pointer' }}>{p}</button>
              ) : (
                <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Recent Movements */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpDown size={18} style={{ color: 'var(--accent)' }} />
                Movimientos recientes
              </h3>
              <button onClick={() => setModal('movement')} style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ver todos</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentMovements.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px', fontSize: '13px' }}>No hay movimientos recientes.</p>
              ) : (
                recentMovements.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: m.type === 'IN' ? 'var(--success-light)' : m.type === 'OUT' ? 'var(--danger-light)' : 'var(--info-light)', flexShrink: 0 }}>
                      {m.type === 'IN' ? <TrendingUp size={16} style={{ color: 'var(--success)' }} /> : m.type === 'OUT' ? <TrendingDown size={16} style={{ color: 'var(--danger)' }} /> : <ArrowUpDown size={16} style={{ color: 'var(--info)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{m.type === 'IN' ? 'Entrada de stock' : m.type === 'OUT' ? 'Salida de stock' : 'Ajuste de stock'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.reason} {m.reference ? `#${m.reference}` : ''}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>{m.productName}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: m.type === 'IN' ? 'var(--success)' : m.type === 'OUT' ? 'var(--danger)' : 'var(--info)', margin: 0 }}>
                        {m.type === 'OUT' ? '-' : '+'}{m.quantity} unidades
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>{formatTimeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                Stock bajo
              </h3>
              <button onClick={() => { setStockFilter('low'); setPage(1); }} style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ver todos</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lowStockProducts.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px', fontSize: '13px' }}>No hay productos con stock bajo.</p>
              ) : (
                lowStockProducts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} style={{ color: 'var(--text-light)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>{p.sku}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', margin: 0 }}>{p.stock} unidades</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>Min: {p.minStock || 5}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Category Value Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                Valor por categoria
              </h3>
              <button onClick={() => setModal('report')} style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ver reporte</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.slice(0, 5).map((cat, i) => {
                const colors = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', '#EC4899'];
                const color = colors[i % colors.length];
                return (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{cat.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(cat.value)} ({cat.percentage.toFixed(1)}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${cat.percentage}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Total:</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(metrics?.totalValue || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {modal === 'view' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} style={{ color: 'var(--accent)' }} />
                Detalle de Inventario - {selectedProduct.name}
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '4px' }}>PRODUCTO</p>
                <p style={{ fontWeight: 600, fontSize: '16px' }}>{selectedProduct.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>SKU: {selectedProduct.sku}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Categoria: {selectedProduct.category}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ubicacion: {formatLocation(selectedProduct.location)}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '4px' }}>INFORMACION DE STOCK</p>
                <div className="form-grid-3" style={{ marginTop: '8px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: 0 }}>Stock actual</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0' }}>{selectedProduct.stock}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: 0 }}>Stock minimo</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0' }}>{selectedProduct.minStock || 5}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: getStockStatus(selectedProduct.stock, selectedProduct.minStock || 5).bg, borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: 0 }}>Estado</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0 0', color: getStockStatus(selectedProduct.stock, selectedProduct.minStock || 5).color }}>{getStockStatus(selectedProduct.stock, selectedProduct.minStock || 5).label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                <strong>Valor de Inventario:</strong> Precio {formatCurrency(selectedProduct.price)} x {selectedProduct.stock} unidades = <strong>{formatCurrency(selectedProduct.price * selectedProduct.stock)}</strong>
              </p>
            </div>

            {productMovements.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Movimientos del producto</p>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Cantidad</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productMovements.slice(0, 5).map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px' }}>{new Date(m.createdAt).toLocaleDateString('es-GT')}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, backgroundColor: m.type === 'IN' ? 'var(--success-light)' : m.type === 'OUT' ? 'var(--danger-light)' : 'var(--info-light)', color: m.type === 'IN' ? 'var(--success)' : m.type === 'OUT' ? 'var(--danger)' : 'var(--info)' }}>
                              {m.type === 'IN' ? 'Entrada' : m.type === 'OUT' ? 'Salida' : 'Ajuste'}
                            </span>
                          </td>
                          <td style={{ padding: '8px' }}>{m.type === 'OUT' ? '-' : '+'}{m.quantity}</td>
                          <td style={{ padding: '8px' }}>{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {true && (
                <button onClick={() => { setModal('edit'); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pencil size={16} /> Editar
                </button>
              )}
              <button onClick={() => setModal(null)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={20} style={{ color: 'var(--accent)' }} />
                Editar Inventario - {selectedProduct.name}
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Informacion del Producto</p>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nombre</label>
                      <input type="text" className="form-control" value={selectedProduct.name} disabled style={{ opacity: 0.6 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">SKU</label>
                      <input type="text" className="form-control" value={selectedProduct.sku} disabled style={{ opacity: 0.6 }} />
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Stock y Ubicacion</p>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stock *</label>
                      <input type="number" min="0" className="form-control" value={editStock} onChange={e => setEditStock(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stock Minimo</label>
                      <input type="number" min="0" className="form-control" value={editMinStock} onChange={e => setEditMinStock(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label className="form-label">Ubicacion - Almacen</label>
                    <input type="text" className="form-control" value={editWarehouse} onChange={e => setEditWarehouse(e.target.value)} placeholder="Almacen Principal" />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Pasillo</label>
                      <input type="text" className="form-control" value={editAisle} onChange={e => setEditAisle(e.target.value)} placeholder="Pasillo A" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Estante</label>
                      <input type="text" className="form-control" value={editShelf} onChange={e => setEditShelf(e.target.value)} placeholder="Estante 1" />
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Precio y Costo</p>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Precio (Q) *</label>
                      <input type="number" step="0.01" min="0" className="form-control" value={editPrice} onChange={e => setEditPrice(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Costo (Q)</label>
                      <input type="number" step="0.01" min="0" className="form-control" value={editCostPrice} onChange={e => setEditCostPrice(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {formLoading ? 'Guardando...' : 'Actualizar Inventario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar Producto</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                Estas seguro de eliminar <strong>{selectedProduct.name}</strong> del inventario?
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 500 }}>Esta accion eliminara permanentemente el producto y su historial.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading} style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleDelete} className="btn btn-danger" disabled={formLoading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={16} /> {formLoading ? 'Eliminando...' : 'Eliminar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {modal === 'movement' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpDown size={20} style={{ color: 'var(--accent)' }} />
                Registrar Movimiento
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleRegisterMovement}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Producto *</label>
                  <select className="form-control" value={movProductId} onChange={e => setMovProductId(e.target.value)} required>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stock: {p.stock}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de movimiento *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setMovType(t)} className={`btn ${movType === t ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '12px' }}>
                        {t === 'IN' ? 'Entrada' : t === 'OUT' ? 'Salida' : 'Ajuste'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad *</label>
                  <input type="number" min="1" className="form-control" value={movQuantity} onChange={e => setMovQuantity(e.target.value)} placeholder="Cantidad" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo</label>
                  <input type="text" className="form-control" value={movReason} onChange={e => setMovReason(e.target.value)} placeholder="Ej: Venta, Compra, Ajuste fisico" />
                </div>
                <div className="form-group">
                  <label className="form-label">Referencia</label>
                  <input type="text" className="form-control" value={movReference} onChange={e => setMovReference(e.target.value)} placeholder="Ej: V-000123, C-000045" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {formLoading ? 'Registrando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {modal === 'report' && metrics && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                Reporte de Inventario
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Total productos</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0 0' }}>{metrics.totalProducts}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Valor total</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--accent)' }}>{formatCurrency(metrics.totalValue)}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Unidades totales</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0 0' }}>{metrics.totalUnits}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--warning-light)', borderRadius: '10px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Stock bajo</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--warning)' }}>{metrics.lowStock} productos</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Productos con stock bajo</p>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Stock</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Minimo</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>{p.name}</td>
                        <td style={{ padding: '8px' }}>{p.stock}</td>
                        <td style={{ padding: '8px' }}>{p.minStock || 5}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, backgroundColor: getStockStatus(p.stock, p.minStock || 5).bg, color: getStockStatus(p.stock, p.minStock || 5).color }}>
                            {getStockStatus(p.stock, p.minStock || 5).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={exportCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Exportar CSV
              </button>
              <button onClick={() => setModal(null)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
