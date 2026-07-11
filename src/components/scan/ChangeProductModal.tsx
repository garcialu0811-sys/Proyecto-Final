'use client';

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Search, Package, DollarSign, AlertTriangle } from 'lucide-react';

interface ChangeProductModalProps {
  receipt: {
    folio: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  };
  onClose: () => void;
  onConfirm: (data: {
    originalFolio: string;
    oldProductId: string;
    oldProductName: string;
    oldProductPrice: number;
    newProductId: string;
    newProductName: string;
    newProductPrice: number;
    difference: number;
  }) => void;
}

export function ChangeProductModal({ receipt, onClose, onConfirm }: ChangeProductModalProps) {
  const [oldProductIdx, setOldProductIdx] = useState<number>(-1);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductId, setNewProductId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const oldProduct = oldProductIdx >= 0 ? receipt.items[oldProductIdx] : null;
  const difference = oldProduct ? newProductPrice - oldProduct.price : 0;

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`/api/products/public?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      setSearchResults(data.products || data || []);
      setShowSearch(true);
    } catch { setSearchResults([]); }
  };

  const selectProduct = (product: any) => {
    setNewProductName(product.name);
    setNewProductPrice(product.price);
    setNewProductId(product.id);
    setShowSearch(false);
    setSearchTerm('');
  };

  const handleSubmit = () => {
    if (oldProductIdx < 0 || !newProductId || !oldProduct) return;
    onConfirm({
      originalFolio: receipt.folio,
      oldProductId: oldProduct.productId,
      oldProductName: oldProduct.productName,
      oldProductPrice: oldProduct.price,
      newProductId,
      newProductName,
      newProductPrice,
      difference,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '16px'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-secondary)', borderRadius: '16px', maxWidth: '500px',
          width: '100%', padding: isMobile ? '20px' : '24px', maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <RefreshCw size={18} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Realizar Cambio</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No. {receipt.folio}</p>
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

        {/* Old product */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Producto a devolver
          </label>
          <select
            value={oldProductIdx}
            onChange={e => setOldProductIdx(Number(e.target.value))}
            className="form-control"
          >
            <option value={-1}>Seleccionar producto</option>
            {receipt.items.map((item, idx) => (
              <option key={idx} value={idx}>
                {item.productName} - Q{item.price.toFixed(2)}
              </option>
            ))}
          </select>
          {oldProduct && (
            <div style={{
              marginTop: '8px', padding: '10px', background: '#fef2f2', borderRadius: '8px',
              border: '1px solid #fecaca', fontSize: '13px'
            }}>
              <p style={{ color: 'var(--text-secondary)' }}>Valor: <strong style={{ color: 'var(--text-primary)' }}>Q{oldProduct.price.toFixed(2)}</strong></p>
            </div>
          )}
        </div>

        {/* New product */}
        <div style={{ marginBottom: '16px', position: 'relative' }} ref={searchRef}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Producto nuevo
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }} />
            <input
              type="text"
              value={searchTerm || newProductName}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '14px' }}
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', zIndex: 20, left: 0, right: 0, marginTop: '4px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: '200px', overflow: 'auto'
            }}>
              {searchResults.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => selectProduct(product)}
                  style={{
                    width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Package size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{product.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Q{product.price.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {newProductName && (
            <div style={{
              marginTop: '8px', padding: '10px', background: '#f0fdf4', borderRadius: '8px',
              border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <Package size={16} style={{ color: 'var(--success)' }} />
              <div>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{newProductName}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor: Q{newProductPrice.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Difference */}
        {oldProduct && newProductName && (
          <div style={{
            padding: '14px', borderRadius: '8px', marginBottom: '16px',
            background: difference > 0 ? '#fffbeb' : difference < 0 ? '#f0fdf4' : 'var(--bg-primary)',
            border: `1px solid ${difference > 0 ? '#fde68a' : difference < 0 ? '#bbf7d0' : 'var(--border)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={20} style={{ color: difference > 0 ? '#d97706' : 'var(--success)' }} />
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Diferencia a pagar</p>
                <p style={{
                  fontSize: '22px', fontWeight: 800,
                  color: difference > 0 ? '#d97706' : 'var(--success)'
                }}>
                  {difference > 0 ? '+' : ''}Q{difference.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div style={{
          padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px'
        }}>
          <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12px', color: '#991b1b' }}>
            No se realizan devoluciones de dinero. Solo se permiten cambios de productos por otros de igual o mayor valor.
          </p>
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
            disabled={oldProductIdx < 0 || !newProductId}
            style={{
              flex: 1, padding: isMobile ? '14px' : '10px', border: 'none',
              borderRadius: '8px', background: '#d97706', color: '#fff',
              cursor: oldProductIdx < 0 || !newProductId ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px',
              opacity: oldProductIdx < 0 || !newProductId ? 0.5 : 1,
              minHeight: isMobile ? '48px' : 'auto'
            }}
          >
            <RefreshCw size={16} />
            Confirmar Cambio
          </button>
        </div>
      </div>
    </div>
  );
}
