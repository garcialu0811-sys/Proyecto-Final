'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  QrCode, 
  Download, 
  Edit3, 
  Trash2, 
  Camera, 
  X,
  PlusCircle,
  Package,
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  qrCode: string;
}

export default function CatalogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'CLIENTE';

  useEffect(() => {
    if (status === 'loading') return;
    if (session && (role === 'ADMIN' || role === 'VENDEDOR')) {
      router.replace('/dashboard');
    } else if (!session || role === 'CLIENTE') {
      router.replace('/store');
    }
  }, [session, status, role, router]);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  // Modals state
  const [activeModal, setActiveModal] = useState<'details' | 'form' | 'scan' | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('Periféricos');
  const [formImage, setFormImage] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (selectedCategory && selectedCategory !== 'Todos') params.set('category', selectedCategory);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setPagination(data.pagination);
      } else {
        showToast('Error al cargar catálogo.', 'error');
      }
    } catch {
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, selectedCategory]);

  // Categories list
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Image upload handler
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
      showToast('Error al conectar con el servidor de imágenes.', 'error');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImageFile(file);
    const preview = URL.createObjectURL(file);
    setFormImagePreview(preview);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  // Filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.description.toLowerCase().includes(search.toLowerCase()) ||
                          product.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Open Details Modal
  const handleOpenDetails = (product: Product) => {
    setCurrentProduct(product);
    setActiveModal('details');
  };

  // Open Form Modal (Add / Edit)
  const handleOpenForm = (product: Product | null = null) => {
    if (product) {
      // Edit mode
      setCurrentProduct(product);
      setFormName(product.name);
      setFormDesc(product.description);
      setFormPrice(product.price.toString());
      setFormStock(product.stock.toString());
      setFormCategory(product.category);
      setFormImage(product.imageUrl);
      setFormImageFile(null);
      setFormImagePreview(product.imageUrl || '');
    } else {
      // Add mode
      if (role !== 'ADMIN') {
        showToast('Solo administradores pueden crear productos.', 'warning');
        return;
      }
      setCurrentProduct(null);
      setFormName('');
      setFormDesc('');
      setFormPrice('');
      setFormStock('');
      setFormCategory('Periféricos');
      setFormImage('');
      setFormImageFile(null);
      setFormImagePreview('');
    }
    setActiveModal('form');
  };

  // Form Submit (Create / Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDesc || !formPrice || !formStock || !formCategory) {
      showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    setFormLoading(true);
    const isEdit = !!currentProduct;
    const url = isEdit ? `/api/products/${currentProduct.id}` : '/api/products';
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
          imageUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? '¡Producto actualizado!' : '¡Producto agregado con código QR generado!', 'success');
        setActiveModal(null);
        fetchProducts();
      } else {
        showToast(data.message || 'Error al guardar producto.', 'error');
      }
    } catch {
      showToast('Error al conectar con la API.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (product: Product) => {
    if (role !== 'ADMIN') {
      showToast('Solo administradores pueden eliminar productos.', 'warning');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Producto eliminado correctamente.', 'success');
        if (activeModal === 'details') setActiveModal(null);
        fetchProducts();
      } else {
        showToast(data.message || 'Error al eliminar producto.', 'error');
      }
    } catch {
      showToast('Error al conectar con la API.', 'error');
    }
  };

  // QR Scanning handling
  const handleOpenScanner = () => {
    setActiveModal('scan');
    setManualCode('');
    // Start scanner after component mounts in DOM
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scannerRef.current = scanner;
        
        scanner.render(
          (decodedText) => {
            // Success callback
            scanner.clear();
            handleScanSuccess(decodedText);
          },
          (error) => {
            // Silent error (polling)
          }
        );
      } catch (err) {
        console.error('Error starting scanner:', err);
      }
    }, 100);
  };

  const handleCloseScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setActiveModal(null);
  };

  const handleScanSuccess = async (code: string) => {
    handleCloseScanner();
    showToast(`Código escaneado: ${code}. Buscando producto...`, 'info');
    try {
      const res = await fetch(`/api/products/qr/${code}`);
      const data = await res.json();
      if (res.ok) {
        showToast(`Producto encontrado: ${data.name}`, 'success');
        handleOpenDetails(data);
      } else {
        showToast('Producto no registrado en QRShop.', 'error');
      }
    } catch {
      showToast('Error al buscar producto escaneado.', 'error');
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode) return;
    handleScanSuccess(manualCode);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Catálogo de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Explora existencias, genera códigos QR e inicia ventas escaneando.
          </p>
        </div>

        <div className="flex-gap-12">
          <button 
            onClick={handleOpenScanner} 
            className="btn btn-secondary" 
            style={{ display: 'flex', gap: '8px' }}
          >
            <Camera size={18} style={{ color: 'var(--accent)' }} />
            <span>Escanear QR</span>
          </button>
          
          {role === 'ADMIN' && (
            <button 
              onClick={() => handleOpenForm()} 
              className="btn btn-primary"
              style={{ display: 'flex', gap: '8px' }}
            >
              <Plus size={18} />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, descripción o categoría..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Categories Horizontal Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '50px', whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="text-center" style={{ padding: '60px' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando catálogo...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Sin Productos Encontrados</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay artículos que coincidan con tu búsqueda actual.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <img 
                src={product.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'} 
                alt={product.name} 
                className="product-img" 
                onClick={() => handleOpenDetails(product)}
                style={{ cursor: 'pointer' }}
              />
              
              <div className="product-body">
                <span className="product-cat">{product.category}</span>
                <h3 
                  className="product-title" 
                  onClick={() => handleOpenDetails(product)}
                  style={{ cursor: 'pointer' }}
                >
                  {product.name}
                </h3>
                <p className="product-desc">{product.description}</p>
                
                <div className="product-footer">
                  <span className="product-price">${product.price.toFixed(2)}</span>
                  <span className={`product-stock ${product.stock <= 5 ? 'low' : ''}`}>
                    {product.stock <= 0 ? 'Sin stock' : `${product.stock} disp.`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. PRODUCT DETAILS MODAL */}
      {activeModal === 'details' && currentProduct && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Detalle de Producto</h2>
              <button className="modal-close" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <img 
                src={currentProduct.imageUrl} 
                alt={currentProduct.name} 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
              />

              <div>
                <span className="product-cat">{currentProduct.category}</span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 8px 0' }}>{currentProduct.name}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{currentProduct.description}</p>
                
                <div className="flex-between" style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)', display: 'block' }}>PRECIO</span>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>${currentProduct.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)', display: 'block', textAlign: 'right' }}>STOCK</span>
                    <span className={`product-stock ${currentProduct.stock <= 5 ? 'low' : ''}`} style={{ fontSize: '16px', fontWeight: 600 }}>
                      {currentProduct.stock} unidades
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Segment */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <img 
                  src={currentProduct.qrCode} 
                  alt={`QR ${currentProduct.name}`} 
                  style={{ width: '120px', height: '120px', backgroundColor: '#ffffff', padding: '4px', borderRadius: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Código QR Identificador</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', fontFamily: 'monospace', marginBottom: '12px', wordBreak: 'break-all' }}>
                    ID: {currentProduct.id}
                  </p>
                  <a 
                    href={currentProduct.qrCode} 
                    download={`QRShop-${currentProduct.name.replace(/\s+/g, '-')}.png`}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Descargar QR</span>
                  </a>
                </div>
              </div>

              {/* Actions based on role */}
              {(role === 'ADMIN' || role === 'VENDEDOR') && (
                <div className="flex-gap-12" style={{ marginTop: '10px' }}>
                  <button 
                    onClick={() => handleOpenForm(currentProduct)} 
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }}
                  >
                    <Edit3 size={16} />
                    <span>Editar Precio/Stock</span>
                  </button>
                  
                  {role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDeleteProduct(currentProduct)} 
                      className="btn btn-danger"
                      style={{ padding: '10px 16px', display: 'flex', gap: '6px', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                      <span>Eliminar</span>
                    </button>
                  )}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div className="card" style={{ marginTop: '24px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Mostrando {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              disabled={!pagination.hasPrev}
              onClick={() => setCurrentPage(1)}
            >
              Primero
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              disabled={!pagination.hasPrev}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Anterior
            </button>
            <span style={{ fontSize: '13px', padding: '0 8px' }}>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              disabled={!pagination.hasNext}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Siguiente
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              disabled={!pagination.hasNext}
              onClick={() => setCurrentPage(pagination.totalPages)}
            >
              Último
            </button>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD / EDIT FORM MODAL */}
      {activeModal === 'form' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                {currentProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </h2>
              <button className="modal-close" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {role === 'ADMIN' ? (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-name">Nombre del Producto</label>
                    <input
                      id="p-name"
                      type="text"
                      className="form-control"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Teclado Mecánico RGB"
                      disabled={formLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="p-desc">Descripción</label>
                    <textarea
                      id="p-desc"
                      className="form-control"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Descripción técnica del artículo..."
                      rows={3}
                      disabled={formLoading}
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="p-price">Precio ($)</label>
                      <input
                        id="p-price"
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="89.99"
                        disabled={formLoading}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="p-stock">Stock Inicial</label>
                      <input
                        id="p-stock"
                        type="number"
                        className="form-control"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        placeholder="10"
                        disabled={formLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="p-cat">Categoría</label>
                    <select
                      id="p-cat"
                      className="form-control"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      disabled={formLoading}
                    >
                      <option value="Periféricos">Periféricos</option>
                      <option value="Monitores">Monitores</option>
                      <option value="Componentes">Componentes</option>
                      <option value="Audio">Audio</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Imagen del Producto</label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: formImagePreview ? 'transparent' : 'var(--bg-secondary)',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {formImagePreview ? (
                        <img src={formImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                      ) : (
                        <>
                          <Package size={32} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto' }} />
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Arrastra una imagen o haz click para seleccionar</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-light)' }}>JPG, PNG, WebP o GIF (máx. 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    {uploadingImage && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '8px' }}>Subiendo imagen...</p>}
                  </div>
                </>
              ) : (
                // Seller view: can only edit price and stock
                <>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', backgroundColor: 'var(--warning-light)', borderRadius: '4px', borderLeft: '3px solid var(--warning)' }}>
                    Como vendedor, solo tienes permisos para actualizar el precio y las existencias (stock).
                  </p>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{formName}</h3>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="p-price-sell">Precio ($)</label>
                      <input
                        id="p-price-sell"
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        disabled={formLoading}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="p-stock-sell">Existencias (Stock)</label>
                      <input
                        id="p-stock-sell"
                        type="number"
                        className="form-control"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        disabled={formLoading}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex-gap-12" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)} 
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. QR CODE SCANNER MODAL */}
      {activeModal === 'scan' && (
        <div className="modal-overlay" onClick={handleCloseScanner}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Camera size={20} className="text-accent" />
                <span>Escanear Código QR</span>
              </h2>
              <button className="modal-close" onClick={handleCloseScanner}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="scanner-container">
                <div id="reader" style={{ width: '100%' }}></div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Apunta la cámara de tu dispositivo hacia el código QR del producto.
                </p>
              </div>

              {/* Manual input fallback for testing */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>¿No tienes cámara o estás testeando?</p>
                <form onSubmit={handleManualScanSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ingresa el ID del producto (Ej: prod-1)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    Simular
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spin style injection */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
