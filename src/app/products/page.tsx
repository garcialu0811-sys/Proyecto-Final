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
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import ProductFormModal from '@/components/products/ProductFormModal';
import EditProductModal from '@/components/products/EditProductModal';
import BarcodeComponent from '@/components/ui/Barcode';

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
  const role = user?.role || 'VENDEDOR';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [categories, setCategories] = useState<string[]>([]);

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'qr' | 'details' | 'stockEntry' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [stockEntryQty, setStockEntryQty] = useState('');
  const [stockEntryReason, setStockEntryReason] = useState('');

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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar productos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          className="form-control"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ width: '160px', flexShrink: 0 }}
        >
          <option value="">Categoria</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: '140px', flexShrink: 0 }}
        >
          <option value="">Estado</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando productos...</p>
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
                          {true && (
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
                          {true && (
                            <button
                              onClick={() => { setSelectedProduct(product); setStockEntryQty(''); setStockEntryReason(''); setModal('stockEntry'); }}
                              title="Agregar stock (Entrada)"
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--success)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D1FAE5'; e.currentTarget.style.borderColor = 'var(--success)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                              <ArrowDownCircle size={15} />
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

      <ProductFormModal
        isOpen={modal === 'create'}
        onClose={() => setModal(null)}
        onSuccess={fetchProducts}
        categories={categories}
      />

      <EditProductModal
        isOpen={modal === 'edit'}
        onClose={() => setModal(null)}
        onSuccess={fetchProducts}
        product={selectedProduct}
        categories={categories}
      />

      {modal === 'stockEntry' && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownCircle size={20} style={{ color: 'var(--success)' }} />
                Entrada de Stock
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{selectedProduct.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Stock actual: <strong>{selectedProduct.stock}</strong> unidades</p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const qty = Number(stockEntryQty);
                if (!qty || qty <= 0) { showToast('Ingresa una cantidad valida.', 'warning'); return; }
                setFormLoading(true);
                try {
                  const res = await fetch('/api/inventory/movement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      productId: selectedProduct.id,
                      type: 'IN',
                      quantity: qty,
                      reason: stockEntryReason || 'Entrada de stock',
                    }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    showToast(`Stock actualizado: ${selectedProduct.stock} -> ${data.newStock} unidades.`, 'success');
                    setModal(null);
                    fetchProducts();
                  } else {
                    showToast(data.message || 'Error al registrar entrada.', 'error');
                  }
                } catch {
                  showToast('Error de conexion.', 'error');
                } finally {
                  setFormLoading(false);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Cantidad a agregar *</label>
                  <input type="number" min="1" className="form-control" value={stockEntryQty} onChange={e => setStockEntryQty(e.target.value)} placeholder="Ej: 50" required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo (opcional)</label>
          <input type="text" className="form-control" value={stockEntryReason} onChange={e => setStockEntryReason(e.target.value)} placeholder="Ej: Compra a proveedor" />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                    <ArrowDownCircle size={16} />
                    {formLoading ? 'Registrando...' : 'Registrar Entrada'}
                  </button>
                </div>
              </form>
            </div>
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
                Codigo de Barras
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{selectedProduct.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px' }}>SKU: {selectedProduct.sku || 'N/A'}</p>
              {selectedProduct.qrCode && selectedProduct.qrCode !== 'temp' ? (
                <div id="barcode-page-preview" style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', display: 'inline-block' }}>
                  <BarcodeComponent value={`PROD:${selectedProduct.id}`} maxWidth="260px" />
                </div>
              ) : (
                <div style={{ width: '220px', height: '220px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid var(--border)' }}>
                  <QrCode size={48} style={{ color: 'var(--text-light)' }} />
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '12px', fontFamily: 'monospace' }}>ID: {selectedProduct.id}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '16px 0 8px 0' }}>
              {selectedProduct.qrCode && selectedProduct.qrCode !== 'temp' && (
                <button
                  onClick={() => {
                    const svg = document.querySelector('#barcode-page-preview svg') as SVGSVGElement;
                    if (!svg) return;
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      const scale = 3;
                      canvas.width = img.width * scale;
                      canvas.height = img.height * scale;
                      ctx?.scale(scale, scale);
                      ctx?.drawImage(img, 0, 0);
                      const link = document.createElement('a');
                      link.download = `VariedadesCoatan-${selectedProduct.sku || selectedProduct.name}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    };
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                >
                  <Download size={14} /> Descargar
                </button>
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
