'use client';

import { useState, useEffect } from 'react';
import { Download, Package, DollarSign, Tag, Plus, ChevronRight, Info } from 'lucide-react';

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    sku?: string;
    qrCode?: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    isActive?: boolean;
    imageUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  onDownloadQR: () => void;
  onAddStock: () => void;
}

export function ProductDetail({ product, onDownloadQR, onAddStock }: ProductDetailProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const formatCurrency = (val: number) => `Q${val.toFixed(2)}`;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '16px' : '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '10px', background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
          }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Package size={22} style={{ color: 'var(--accent)' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                background: product.isActive !== false ? '#dcfce7' : '#fee2e2',
                color: product.isActive !== false ? '#16a34a' : '#dc2626'
              }}>
                {product.isActive !== false ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {product.sku && <span>SKU: <strong style={{ color: 'var(--text-primary)' }}>{product.sku}</strong></span>}
              {product.sku && product.qrCode && <span style={{ margin: '0 6px', color: 'var(--border)' }}>|</span>}
              {product.qrCode && <span>Codigo: <strong style={{ color: 'var(--text-primary)' }}>{product.qrCode}</strong></span>}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {product.description}
          </p>
        </div>
      )}

      {/* Info grid */}
      <div style={{
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
      }}>
        <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <DollarSign size={12} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Precio</span>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(product.price)}</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Package size={12} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Stock disponible</span>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{product.stock} unidades</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Tag size={12} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Categoria</span>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{product.category}</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Info size={12} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Estado</span>
          </div>
          <p style={{
            fontSize: '13px', fontWeight: 500,
            color: product.isActive !== false ? 'var(--success)' : 'var(--danger)'
          }}>
            {product.isActive !== false ? 'Activo' : 'Inactivo'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={onDownloadQR}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--accent-light)', borderRadius: '8px',
            border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={18} style={{ color: 'var(--accent)' }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Descargar QR</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Descargar codigo QR del producto</p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-light)' }} />
        </button>

        <button
          onClick={onAddStock}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: '#f0fdf4', borderRadius: '8px',
            border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={18} style={{ color: 'var(--success)' }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Agregar Stock</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Agregar mas unidades a inventario</p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-light)' }} />
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)'
      }}>
        <p style={{ fontSize: '11px', color: 'var(--text-light)', textAlign: 'center' }}>
          Este codigo QR esta vinculado a este producto. Puedes imprimirlo o compartirlo para consultas rapidas.
        </p>
      </div>
    </div>
  );
}
