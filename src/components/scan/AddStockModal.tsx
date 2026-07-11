'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Package } from 'lucide-react';

interface AddStockModalProps {
  product: {
    id: string;
    name: string;
    sku?: string;
    stock: number;
  };
  onClose: () => void;
  onConfirm: (quantity: number, reason: string) => void;
}

export function AddStockModal({ product, onClose, onConfirm }: AddStockModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('Reposicion de inventario');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSubmit = () => {
    if (quantity <= 0) return;
    if (!reason.trim()) return;
    onConfirm(quantity, reason);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '16px'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-secondary)', borderRadius: '16px', maxWidth: '440px',
          width: '100%', padding: isMobile ? '20px' : '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Package size={18} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Agregar Stock</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Agregar mas unidades al inventario</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '8px', border: 'none',
            background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Product info */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Producto</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</p>
          {product.sku && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {product.sku}</p>}
        </div>

        <div style={{
          padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '16px'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stock actual</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{product.stock} unidades</p>
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Cantidad a agregar *
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 0)}
            className="form-control"
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Motivo *
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: Reposicion de inventario"
            className="form-control"
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: isMobile ? '14px' : '10px', border: '1px solid var(--border)',
              borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)',
              cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={quantity <= 0 || !reason.trim()}
            style={{
              flex: 1, padding: isMobile ? '14px' : '10px', border: 'none',
              borderRadius: '8px', background: 'var(--success)', color: '#fff',
              cursor: quantity <= 0 || !reason.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', opacity: quantity <= 0 || !reason.trim() ? 0.5 : 1,
              minHeight: isMobile ? '48px' : 'auto'
            }}
          >
            <Plus size={16} />
            Agregar Stock
          </button>
        </div>
      </div>
    </div>
  );
}
