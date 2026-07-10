'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen, Plus, Search, Filter, Tag, Trophy, Package, CheckCircle, Trash2, Edit,
  Coffee, Watch, Laptop, Pen, Home, Gift, PawPrint, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Coffee, Watch, Laptop, Pen, Home, Trophy: Trophy, Gift, PawPrint, Tag,
};

const ICON_OPTIONS = [
  { name: 'Tag', icon: Tag },
  { name: 'Coffee', icon: Coffee },
  { name: 'Watch', icon: Watch },
  { name: 'Laptop', icon: Laptop },
  { name: 'Pen', icon: Pen },
  { name: 'Home', icon: Home },
  { name: 'Gift', icon: Gift },
  { name: 'PawPrint', icon: PawPrint },
];

const COLOR_OPTIONS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  productCount: number;
  createdAt?: string;
}

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  const [categories, setCategories] = useState<Category[]>([]);
  const [metrics, setMetrics] = useState({ totalCategories: 0, activeCategories: 0, totalProducts: 0, mostUsedCategory: 'N/A', mostUsedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: 'Tag', color: '#3B82F6', isActive: true });
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '10' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/categories?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setMetrics(data.metrics);
        setPagination(data.pagination);
      }
    } catch {
      showToast('Error al cargar categorias.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    
    if (session) fetchCategories();
  }, [session, status, role, fetchCategories]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...categories].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = sortField === 'productCount' ? a.productCount : sortField === 'isActive' ? (a.isActive ? 1 : 0) : String(a[sortField as keyof Category] || '').toLowerCase();
    const bVal = sortField === 'productCount' ? b.productCount : sortField === 'isActive' ? (b.isActive ? 1 : 0) : String(b[sortField as keyof Category] || '').toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const openCreate = () => { setEditingCategory(null); setFormData({ name: '', description: '', icon: 'Tag', color: '#3B82F6', isActive: true }); setShowModal(true); };
  const openEdit = (cat: Category) => { setEditingCategory(cat); setFormData({ name: cat.name, description: cat.description, icon: cat.icon, color: cat.color, isActive: cat.isActive }); setShowModal(true); };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) { showToast('Nombre y descripcion son requeridos.', 'warning'); return; }
    setSaving(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) {
        showToast(editingCategory ? 'Categoria actualizada.' : 'Categoria creada.', 'success');
        setShowModal(false);
        fetchCategories();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al guardar.', 'error');
      }
    } catch { showToast('Error de red.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Eliminar la categoria "${cat.name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Categoria eliminada.', 'success'); fetchCategories(); }
      else {
        const data = await res.json();
        if (data.requiresAction) {
          if (confirm(`${data.message} Se eliminaran los productos asociados.`)) {
            const res2 = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moveToCategory: null }) });
            if (res2.ok) { showToast('Categoria eliminada.', 'success'); fetchCategories(); }
          }
        } else { showToast(data.message || 'Error al eliminar.', 'error'); }
      }
    } catch { showToast('Error de red.', 'error'); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th onClick={() => handleSort(field)} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Categorias</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Organiza y administra las categorias de productos de tu tienda.</p>
        </div>
        {role === 'ADMIN' && (
          <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', gap: '6px' }}><Plus size={18} /> Nueva categoria</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { title: 'Total de categorias', value: metrics.totalCategories, sub: 'Todas las categorias', icon: <FolderOpen size={22} style={{ color: 'var(--accent)' }} />, bg: 'var(--accent-light)' },
          { title: 'Categorias activas', value: metrics.activeCategories, sub: `${metrics.totalCategories ? ((metrics.activeCategories / metrics.totalCategories) * 100).toFixed(1) : 0}% del total`, icon: <CheckCircle size={22} style={{ color: 'var(--success)' }} />, bg: 'var(--success-light)' },
          { title: 'Productos asociados', value: metrics.totalProducts, sub: 'En todas las categorias', icon: <Package size={22} style={{ color: 'var(--info)' }} />, bg: 'var(--info-light)' },
          { title: 'Categoria mas utilizada', value: metrics.mostUsedCategory, sub: `${metrics.mostUsedCount} productos`, icon: <Trophy size={22} style={{ color: 'var(--warning)' }} />, bg: 'var(--warning-light)', isText: true },
        ].map((m, i) => (
          <div key={i} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{m.title}</p>
                <p style={{ fontSize: m.isText ? '18px' : '28px', fontWeight: 700, color: m.isText ? 'var(--accent)' : 'var(--text-primary)' }}>{m.value}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{m.sub}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input type="text" placeholder="Buscar categorias..." className="form-control" style={{ paddingLeft: '36px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: '180px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
        <button className="btn btn-secondary" style={{ display: 'flex', gap: '6px' }}><Filter size={16} /> Filtros</button>
      </div>

      {loading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FolderOpen size={48} style={{ margin: '0 auto 16px auto', display: 'block', color: 'var(--text-light)' }} />
          <p>No se encontraron categorias.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <SortHeader field="name">Categoria</SortHeader>
                  <SortHeader field="description">Descripcion</SortHeader>
                  <SortHeader field="productCount">Productos</SortHeader>
                  <SortHeader field="isActive">Estado</SortHeader>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(cat => {
                  const Icon = ICON_MAP[cat.icon] || Tag;
                  return (
                    <tr key={cat.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={18} style={{ color: cat.color }} />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600 }}>{cat.productCount}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: 600, backgroundColor: cat.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: cat.isActive ? 'var(--success)' : 'var(--danger)' }}>
                          {cat.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {role === 'ADMIN' && (
                            <>
                              <button onClick={() => openEdit(cat)} className="btn btn-secondary" style={{ padding: '6px 10px' }}><Edit size={14} /></button>
                              <button onClick={() => handleDelete(cat)} className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span>Mostrando {sorted.length} de {pagination.total} categorias</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" disabled={!pagination.hasPrev} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
              <span style={{ padding: '8px 12px', fontWeight: 600 }}>{currentPage}</span>
              <button className="btn btn-secondary" disabled={!pagination.hasNext} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre de la categoria" />
            </div>
            <div className="form-group">
              <label className="form-label">Descripcion *</label>
              <textarea className="form-control" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descripcion de la categoria" style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Icono</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ICON_OPTIONS.map(opt => {
                  const Ic = opt.icon;
                  return (
                    <button key={opt.name} onClick={() => setFormData({ ...formData, icon: opt.name })} style={{ width: '40px', height: '40px', borderRadius: '10px', border: formData.icon === opt.name ? `2px solid ${formData.color}` : '2px solid var(--border)', backgroundColor: formData.icon === opt.name ? `${formData.color}15` : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Ic size={18} style={{ color: formData.icon === opt.name ? formData.color : 'var(--text-secondary)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setFormData({ ...formData, color: c })} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c, border: formData.color === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setFormData({ ...formData, isActive: true })} className={`btn ${formData.isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Activa</button>
                <button onClick={() => setFormData({ ...formData, isActive: false })} className={`btn ${!formData.isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Inactiva</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }} disabled={saving}>
                {saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </>
  );
}
