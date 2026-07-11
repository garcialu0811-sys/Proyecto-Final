'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, CheckCircle, Eye, Save, Download } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import Barcode from '@/components/ui/Barcode';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  minStock?: number;
  category: string;
  sku: string;
  imageUrl: string;
  qrCode: string;
  isActive: boolean;
  costPrice?: number;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  categories: string[];
}

const PRODUCT_CATEGORIES = [
  'Bebidas', 'Accesorios', 'Electrónicos', 'Papelería',
  'Hogar', 'Deportes', 'Regalos', 'Mascotas', 'Ropa', 'Otros',
];

export default function EditProductModal({ isOpen, onClose, onSuccess, product, categories }: EditProductModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setFormName(product.name);
      setFormSku(product.sku || '');
      setFormCategory(product.category);
      setFormPrice(product.price.toString());
      setFormStock(product.stock.toString());
      setFormDesc(product.description);
      setFormImagePreview(product.imageUrl || '');
      setFormImageFile(null);
    } else if (!isOpen) {
      setFormName('');
      setFormSku('');
      setFormCategory('');
      setFormPrice('');
      setFormStock('');
      setFormDesc('');
      setFormImagePreview('');
      setFormImageFile(null);
    }
  }, [isOpen, product]);

  const allCategories = [...new Set([...PRODUCT_CATEGORIES, ...categories])].sort();

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
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no puede superar 5MB.', 'warning');
      return;
    }
    setFormImageFile(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('La imagen no puede superar 5MB.', 'warning');
        return;
      }
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDesc || !formPrice || !formStock || !formCategory || !product) {
      showToast('Completa todos los campos requeridos.', 'warning');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = formImagePreview;
      if (formImageFile) {
        const uploaded = await handleImageUpload(formImageFile);
        if (uploaded) imageUrl = uploaded;
      }

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          price: Number(formPrice),
          stock: Number(formStock),
          category: formCategory,
          sku: formSku || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Producto actualizado exitosamente.', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.message || 'Error al actualizar producto.', 'error');
      }
    } catch {
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Editar Producto</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Modifica la informacion de <strong>{product.name}</strong>.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '4px' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', padding: '24px' }}>

            {/* Left: Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre del producto *</label>
                <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-control" value={formSku} onChange={e => setFormSku(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select className="form-control" value={formCategory} onChange={e => setFormCategory(e.target.value)} required>
                    <option value="">Seleccionar</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Precio (Q) *</label>
                  <input type="number" step="0.01" min="0" className="form-control" value={formPrice} onChange={e => setFormPrice(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock *</label>
                  <input type="number" min="0" className="form-control" value={formStock} onChange={e => setFormStock(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripcion *</label>
                <textarea className="form-control" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} required style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Imagen del producto</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center',
                    cursor: 'pointer', backgroundColor: formImagePreview ? 'transparent' : 'var(--bg-primary)',
                    transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', gap: '12px',
                    justifyContent: formImagePreview ? 'flex-start' : 'center',
                  }}
                >
                  {formImagePreview ? (
                    <>
                      <div style={{ position: 'relative' }}>
                        <img src={formImagePreview} alt="Preview" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} />
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setFormImageFile(null); setFormImagePreview(''); }}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                        ><X size={10} /></button>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Clic o arrastra para cambiar imagen</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>PNG, JPG o WEBP (max. 5MB)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={20} style={{ color: 'var(--text-light)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Haz clic o arrastra una imagen aqui</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>PNG, JPG o WEBP (max. 5MB)</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                {uploadingImage && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '6px' }}>Subiendo imagen...</p>}
              </div>
            </div>

            {/* Right: Barcode Preview */}
            <div>
              {/* Barcode Existing Badge */}
              <div style={{ padding: '12px 16px', backgroundColor: '#DBEAFE', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', margin: 0 }}>Codigo de barras existente</p>
                  <p style={{ fontSize: '11px', color: '#1D4ED8', margin: '2px 0 0 0' }}>El codigo se mantiene al actualizar el producto.</p>
                </div>
              </div>

              {/* Barcode Preview Card */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Codigo de barras del producto</p>
                <div id="barcode-edit-preview" style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid var(--border)', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {product.id ? (
                    <Barcode value={product.id} width={1.5} height={35} fontSize={11} maxWidth="260px" />
                  ) : (
                    <div style={{ padding: '20px' }}>
                      <Package size={40} style={{ color: 'var(--text-light)', margin: '0 auto 8px auto', display: 'block' }} />
                      <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>Sin codigo de barras generado</p>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
                  Este codigo de barras es unico para este producto y puede ser escaneado desde la app.
                </p>
                {product.qrCode && (
                  <button
                    type="button"
                    onClick={() => {
                      const svg = document.querySelector('#barcode-edit-preview svg') as SVGSVGElement;
                      if (!svg) return;
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.drawImage(img, 0, 0);
                        const link = document.createElement('a');
                        link.download = `VariedadesCoatan-${product.sku || product.name}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    }}
                    style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-primary)' }}
                  >
                    <Download size={14} /> Descargar codigo de barras
                  </button>
                )}
              </div>

              {/* Product Info */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', fontSize: '13px' }}>
                <p style={{ margin: '4px 0' }}>ID: <code style={{ fontSize: '11px', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{product.id}</code></p>
                <p style={{ margin: '4px 0' }}>SKU: <strong>{product.sku || 'Sin SKU'}</strong></p>
                <p style={{ margin: '4px 0' }}>Stock actual: <strong>{product.stock}</strong> unidades</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} />
              {loading ? 'Guardando...' : 'Actualizar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
