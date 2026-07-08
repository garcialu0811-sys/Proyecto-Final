'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Download,
  X,
  Package,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  imageUrl: string;
  qrCode: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'CLIENTE';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [categories, setCategories] = useState<string[]>([]);

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'qr' | 'details' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setPagination(data.pagination);

        if (categories.length === 0) {
          const allRes = await fetch('/api/products?limit=1000');
          if (allRes.ok) {
            const allData = await allRes.json();
            const cats = [...new Set(allData.products.map((p: Product) => p.category))] as string[];
            setCategories(cats.sort());
          }
        }
      }
    } catch {
      showToast('Error al cargar productos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) fetchProducts();
  }, [session, status]);

  useEffect(() => {
    fetchProducts();
  }, [page, search, category, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    setUploadingImage(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) return data.url;
      showToast(data.message || 'Error al subir imagen.', 'error');
      return null;
    } catch {
      showToast('Error al conectar con el servidor de imagenes.', 'error');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImageFile(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    setSelectedProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormStock('');
    setFormCategory('');
    setFormSku('');
    setFormImage('');
    setFormImageFile(null);
    setFormImagePreview('');
    setModal('create');
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormPrice(p.price.toString());
    setFormStock(p.stock.toString());
    setFormCategory(p.category);
    setFormSku(p.sku);
    setFormImage(p.imageUrl);
    setFormImageFile(null);
    setFormImagePreview(p.imageUrl || '');
    setModal('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDesc || !formPrice || !formStock || !formCategory) {
      showToast('Completa todos los campos requeridos.', 'warning');
      return;
    }
    setFormLoading(true);
    const isEdit = !!selectedProduct;
    const url = isEdit ? `/api/products/${selectedProduct.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      let imageUrl = formImage;
      if (formImageFile) {
        const uploaded = await handleImageUpload(formImageFile);
        if (uploaded) imageUrl = uploaded;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          price: Number(formPrice),
          stock: Number(formStock),
          category: formCategory,
          sku: formSku || undefined,
          imageUrl,
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? 'Producto actualizado.' : 'Producto creado.', 'success');
        setModal(null);
        fetchProducts();
      } else {
        showToast(data.message || 'Error al guardar.', 'error');
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
        fetchProducts();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al eliminar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Agotado', color: 'var(--danger)', bg: 'var(--danger-light)' };
    if (stock <= 5) return { label: 'Bajo stock', color: 'var(--warning)', bg: 'var(--warning-light)' };
    if (stock <= 20) return { label: 'Disponible', color: 'var(--success)', bg: 'var(--success-light)' };
    return { label: 'En stock', color: 'var(--info)', bg: 'var(--info-light)' };
  };

  const formatPrice = (price: number) => `Q${price.toFixed(2)}`;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages;
    const cp = pagination.page;
    if (tp <= 5) {
      for (let i = 1; i <= tp; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cp > 3) pages.push('...');
      for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) {
        pages.push(i);
      }
      if (cp < tp - 2) pages.push('...');
      pages.push(tp);
    }
    return pages;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} style={{ color: 'var(--accent)' }} />
            Productos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Gestiona y administra los productos de tu tienda.
          </p>
        </div>
        {role === 'ADMIN' && (
          <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            <Plus size={18} />
            Nuevo producto
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar productos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>
          <select
            className="form-control"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            style={{ minWidth: '180px', height: '40px' }}
          >
            <option value="">Todas las categorias</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '170px', height: '40px' }}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px' }}>
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
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
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Package size={22} style={{ color: 'var(--text-light)' }} />
                            )}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{product.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{product.category}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(product.price)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{product.stock} unidades</span>
                          <p style={{ fontSize: '12px', color: stockStatus.color, fontWeight: 500, margin: '2px 0 0 0' }}>{stockStatus.label}</p>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: product.isActive !== false ? 'var(--success-light)' : 'var(--danger-light)',
                          color: product.isActive !== false ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {product.isActive !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {role !== 'CLIENTE' && (
                            <button
                              onClick={() => openEdit(product)}
                              title="Editar"
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--accent)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {role === 'ADMIN' && (
                            <button
                              onClick={() => { setSelectedProduct(product); setModal('delete'); }}
                              title="Eliminar"
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--danger)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger-light)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4, transition: 'all 0.15s' }}
            >
              <ChevronLeft size={16} />
            </button>
            {getPageNumbers().map((p, i) => (
              typeof p === 'number' ? (
                <button
                  key={i}
                  onClick={() => setPage(p)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px', border: 'none',
                    background: p === pagination.page ? 'var(--accent)' : 'transparent',
                    color: p === pagination.page ? '#fff' : 'var(--text-secondary)',
                    fontWeight: p === pagination.page ? 700 : 500,
                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p}
                </button>
              ) : (
                <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>
              )
            ))}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext}
              style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4, transition: 'all 0.15s' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Nuevo Producto</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del producto" required />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-control" value={formSku} onChange={e => setFormSku(e.target.value)} placeholder="Ej: CAF-001 (se genera automaticamente si se deja vacio)" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripcion *</label>
                  <textarea className="form-control" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descripcion del producto" rows={3} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Precio (Q) *</label>
                    <input type="number" step="0.01" className="form-control" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input type="number" className="form-control" value={formStock} onChange={e => setFormStock(e.target.value)} placeholder="0" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <input type="text" className="form-control" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="Ej: Bebidas, Electronica" list="category-list" required />
                  <datalist id="category-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Imagen</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setFormImageFile(f); setFormImagePreview(URL.createObjectURL(f)); } }}
                    onDragOver={e => e.preventDefault()}
                    style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', backgroundColor: formImagePreview ? 'transparent' : 'var(--bg-primary)', transition: 'border-color 0.2s' }}
                  >
                    {formImagePreview ? (
                      <img src={formImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px' }} />
                    ) : (
                      <>
                        <Upload size={28} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto', display: 'block' }} />
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Arrastra una imagen o haz click</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                  {uploadingImage && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '6px' }}>Subiendo imagen...</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} />
                  {formLoading ? 'Guardando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'edit' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Editar Producto</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-control" value={formSku} onChange={e => setFormSku(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripcion *</label>
                  <textarea className="form-control" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Precio (Q) *</label>
                    <input type="number" step="0.01" className="form-control" value={formPrice} onChange={e => setFormPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input type="number" className="form-control" value={formStock} onChange={e => setFormStock(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <input type="text" className="form-control" value={formCategory} onChange={e => setFormCategory(e.target.value)} list="category-list-edit" required />
                  <datalist id="category-list-edit">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Imagen</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setFormImageFile(f); setFormImagePreview(URL.createObjectURL(f)); } }}
                    onDragOver={e => e.preventDefault()}
                    style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: formImagePreview ? 'transparent' : 'var(--bg-primary)' }}
                  >
                    {formImagePreview ? (
                      <img src={formImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px' }} />
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click para cambiar imagen</p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} />
                  {formLoading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'delete' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar Producto</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                Estas seguro de eliminar <strong>{selectedProduct.name}</strong>?
              </p>
              <p style={{ color: 'var(--text-light)', fontSize: '12px' }}>Esta accion no se puede deshacer.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading} style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleDelete} className="btn btn-danger" disabled={formLoading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={16} />
                {formLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'qr' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} style={{ color: 'var(--accent)' }} />
                Codigo QR
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{selectedProduct.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px' }}>SKU: {selectedProduct.sku || 'N/A'}</p>
              {selectedProduct.qrCode && selectedProduct.qrCode !== 'temp' ? (
                <img src={selectedProduct.qrCode} alt={`QR ${selectedProduct.name}`} style={{ width: '220px', height: '220px', backgroundColor: '#fff', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: '220px', height: '220px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid var(--border)' }}>
                  <QrCode size={48} style={{ color: 'var(--text-light)' }} />
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '12px', fontFamily: 'monospace' }}>ID: {selectedProduct.id}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '16px 0 8px 0' }}>
              {selectedProduct.qrCode && selectedProduct.qrCode !== 'temp' && (
                <a href={selectedProduct.qrCode} download={`QRShop-${selectedProduct.name.replace(/\s+/g, '-')}.png`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                  <Download size={16} />
                  Descargar QR
                </a>
              )}
              <button onClick={() => setModal(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
