'use client';

import { useState, useEffect } from 'react';
import { Receipt, RefreshCw, ChevronRight, Calendar, Clock, User, Info } from 'lucide-react';

interface ReceiptDetailProps {
  receipt: {
    folio: string;
    date: string;
    time: string;
    sellerName: string;
    items: Array<{
      productName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
  };
  onChangeProduct: () => void;
}

export function ReceiptDetail({ receipt, onChangeProduct }: ReceiptDetailProps) {
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
      <div style={{
        padding: isMobile ? '16px' : '20px', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, var(--accent-light), transparent)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Receipt size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>RECIBO DE VENTA</h3>
            <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>No. {receipt.folio}</p>
          </div>
        </div>
      </div>

      {/* Sale info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--accent)' }} />
            <span>Fecha: <strong style={{ color: 'var(--text-primary)' }}>{receipt.date}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} style={{ color: 'var(--accent)' }} />
            <span>Hora: <strong style={{ color: 'var(--text-primary)' }}>{receipt.time}</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <User size={14} style={{ color: 'var(--accent)' }} />
          <span>Vendedor: <strong style={{ color: 'var(--text-primary)' }}>{receipt.sellerName}</strong></span>
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px' }}>Producto</th>
              <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px' }}>Cant.</th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px' }}>Precio</th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '11px' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.productName}</p>
                </td>
                <td style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(item.price)}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ borderTop: '2px solid var(--border)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(receipt.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Descuento</span>
            <span style={{ color: 'var(--success)' }}>{formatCurrency(receipt.discount)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', paddingTop: '10px',
            borderTop: '1px dashed var(--border)'
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(receipt.total)}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div style={{ padding: '0 20px 16px' }}>
        <button
          onClick={onChangeProduct}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: '#fffbeb', borderRadius: '8px',
            border: '1px solid #fde68a', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw size={18} style={{ color: '#d97706' }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Realizar Cambio</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cambiar un producto por otro</p>
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
          No se realizan devoluciones de dinero. Solo se permiten cambios de productos.
        </p>
      </div>
    </div>
  );
}
