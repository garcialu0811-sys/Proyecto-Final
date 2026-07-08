'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, ShoppingBag, Save, Check, Clock, Trash2, Edit3, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import confetti from 'canvas-confetti';

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

interface ScanHistoryItem {
  productId: string;
  productName: string;
  action: string;
  timestamp: string;
}

export default function ScanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'CLIENTE';

  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [sellQty, setSellQty] = useState('1');
  const [clientName, setClientName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalName, setEditModalName] = useState('');
  const [editModalDesc, setEditModalDesc] = useState('');
  const [editModalPrice, setEditModalPrice] = useState('');
  const [editModalStock, setEditModalStock] = useState('');
  const [editModalCategory, setEditModalCategory] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') { showToast('Acceso restringido.', 'error'); router.push('/'); return; }
      const saved = localStorage.getItem('qrshop-scan-history');
      if (saved) setScanHistory(JSON.parse(saved));
      startScanner();
    }
    return () => stopScanner();
  }, [session, status]);

  const startScanner = () => {
    setTimeout(() => {
      try {
        if (scannerRef.current) return;
        const scanner = new Html5QrcodeScanner('scan-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scannerRef.current = scanner;
        scanner.render((decodedText) => { handleScanSuccess(decodedText); }, () => {});
      } catch (err) { console.error('Scanner error:', err); }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) { try { scannerRef.current.clear(); } catch {} scannerRef.current = null; }
  };

  const addToHistory = (productId: string, productName: string, action: string) => {
    const item: ScanHistoryItem = { productId, productName, action, timestamp: new Date().toISOString() };
    const updated = [item, ...scanHistory].slice(0, 20);
    setScanHistory(updated);
    localStorage.setItem('qrshop-scan-history', JSON.stringify(updated));
  };

  const clearHistory = () => { setScanHistory([]); localStorage.removeItem('qrshop-scan-history'); showToast('Historial limpiado.', 'info'); };

  const handleScanSuccess = async (code: string) => {
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/products/qr/${code}`);
      const data = await res.json();
      if (res.ok) {
        setScannedProduct(data);
        setEditPrice(data.price.toString());
        setEditStock(data.stock.toString());
        setSellQty('1');
        addToHistory(data.id, data.name, 'Escaneado');
        showToast(`Producto encontrado: ${data.name}`, 'success');
      } else {
        showToast('Producto no registrado.', 'error');
      }
    } catch { showToast('Error al buscar producto.', 'error'); }
    finally { setLoadingSearch(false); }
  };

  const handleManualSubmit = (e: React.FormEvent) => { e.preventDefault(); if (manualCode) handleScanSuccess(manualCode); };

  const handleQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${scannedProduct.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(editPrice), stock: Number(editStock) })
      });
      const data = await res.json();
      if (res.ok) { setScannedProduct(data); addToHistory(data.id, data.name, 'Editado'); showToast('Producto actualizado.', 'success'); }
      else { showToast(data.message || 'Error al actualizar.', 'error'); }
    } catch { showToast('Error de conexión.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleQuickSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct || Number(sellQty) <= 0) return;
    if (scannedProduct.stock < Number(sellQty)) { showToast('Stock insuficiente.', 'error'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: scannedProduct.id, quantity: Number(sellQty), clientName: clientName || 'Venta QR' })
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        addToHistory(scannedProduct.id, scannedProduct.name, `Vendido x${sellQty}`);
        showToast('¡Venta realizada!', 'success');
        handleScanSuccess(scannedProduct.id);
        setSellQty('1'); setClientName('');
      } else { showToast(data.message || 'Error al vender.', 'error'); }
    } catch { showToast('Error de conexión.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteProduct = async () => {
    if (!scannedProduct || role !== 'ADMIN') return;
    if (!confirm(`¿Eliminar "${scannedProduct.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${scannedProduct.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Producto eliminado.', 'success'); setScannedProduct(null); }
      else { showToast('Error al eliminar.', 'error'); }
    } catch { showToast('Error de conexión.', 'error'); }
  };

  const handleOpenEditModal = () => {
    if (!scannedProduct) return;
    setEditModalName(scannedProduct.name);
    setEditModalDesc(scannedProduct.description);
    setEditModalPrice(scannedProduct.price.toString());
    setEditModalStock(scannedProduct.stock.toString());
    setEditModalCategory(scannedProduct.category);
    setShowEditModal(true);
  };

  const handleSaveEditModal = async () => {
    if (!scannedProduct) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${scannedProduct.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editModalName, description: editModalDesc, price: Number(editModalPrice), stock: Number(editModalStock), category: editModalCategory })
      });
      const data = await res.json();
      if (res.ok) { setScannedProduct(data); setShowEditModal(false); addToHistory(data.id, data.name, 'Editado completo'); showToast('Producto actualizado.', 'success'); }
      else { showToast(data.message || 'Error.', 'error'); }
    } catch { showToast('Error de conexión.', 'error'); }
    finally { setActionLoading(false); }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Escanear Códigos QR</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Escanea productos para editar, vender o ver detalles.</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="btn btn-secondary" style={{ display: 'flex', gap: '8px' }}>
          <Clock size={18} />
          <span>Historial ({scanHistory.length})</span>
        </button>
      </div>

      {showHistory && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Historial de Escaneos</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearHistory} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--danger)' }}>
                <Trash2 size={12} /> Limpiar
              </button>
              <button onClick={() => setShowHistory(false)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <X size={12} />
              </button>
            </div>
          </div>
          {scanHistory.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '13px' }}>Sin escaneos recientes.</p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {scanHistory.map((item, idx) => (
                <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div><span style={{ fontWeight: 600 }}>{item.productName}</span> — <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span></div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{new Date(item.timestamp).toLocaleString('es-ES')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'flex-start', gap: '24px' }}>
        <div className="card">
          <h2 className="card-title"><span>Lector QR</span><Camera size={20} style={{ color: 'var(--accent)' }} /></h2>
          <div className="scanner-container" style={{ minHeight: '300px', display: 'flex', justifyContent: 'center' }}>
            <div id="scan-reader" style={{ width: '100%' }}></div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Simular lectura</h3>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="form-control" placeholder="ID del producto (Ej: prod-1)" value={manualCode} onChange={e => setManualCode(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={loadingSearch}>Escanear</button>
            </form>
          </div>
        </div>

        <div className="card" style={{ minHeight: '300px' }}>
          <h2 className="card-title"><span>Producto Escaneado</span><ShoppingBag size={20} style={{ color: 'var(--accent)' }} /></h2>

          {loadingSearch ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Buscando...</p>
          ) : !scannedProduct ? (
            <div style={{ padding: '60px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Camera size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Esperando Lectura</p>
              <p style={{ fontSize: '12px' }}>Escanea un QR o introduce un ID.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={scannedProduct.imageUrl} alt={scannedProduct.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{scannedProduct.name}</h3>
                  <span className="role-tag vendedor">{scannedProduct.category}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Stock: {scannedProduct.stock} | Precio: ${scannedProduct.price.toFixed(2)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {role === 'ADMIN' && (
                  <>
                    <button onClick={handleOpenEditModal} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}>
                      <Edit3 size={12} /> Editar
                    </button>
                    <button onClick={handleDeleteProduct} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: 'var(--danger)' }}>
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </>
                )}
              </div>

              {(role === 'ADMIN' || role === 'VENDEDOR') && (
                <form onSubmit={handleQuickEdit} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--accent)' }}>Ajuste Rápido</h4>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Precio ($)</label>
                      <input type="number" step="0.01" className="form-control" value={editPrice} onChange={e => setEditPrice(e.target.value)} disabled={actionLoading} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Stock</label>
                      <input type="number" className="form-control" value={editStock} onChange={e => setEditStock(e.target.value)} disabled={actionLoading} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', gap: '4px' }} disabled={actionLoading}>
                    <Save size={14} /> Guardar Cambios
                  </button>
                </form>
              )}

              {role === 'VENDEDOR' && (
                <form onSubmit={handleQuickSell} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--success)' }}>Registrar Venta</h4>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Cantidad</label>
                      <input type="number" min="1" max={scannedProduct.stock} className="form-control" value={sellQty} onChange={e => setSellQty(e.target.value)} disabled={actionLoading} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Cliente</label>
                      <input type="text" placeholder="Nombre" className="form-control" value={clientName} onChange={e => setClientName(e.target.value)} disabled={actionLoading} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', gap: '4px' }} disabled={actionLoading || scannedProduct.stock <= 0}>
                    <Check size={14} /> {scannedProduct.stock <= 0 ? 'Sin stock' : 'Vender'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Editar Producto</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" value={editModalName} onChange={e => setEditModalName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-control" rows={3} value={editModalDesc} onChange={e => setEditModalDesc(e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input type="number" step="0.01" className="form-control" value={editModalPrice} onChange={e => setEditModalPrice(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Stock</label>
                <input type="number" className="form-control" value={editModalStock} onChange={e => setEditModalStock(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-control" value={editModalCategory} onChange={e => setEditModalCategory(e.target.value)}>
                <option value="Periféricos">Periféricos</option>
                <option value="Monitores">Monitores</option>
                <option value="Componentes">Componentes</option>
                <option value="Audio">Audio</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSaveEditModal} className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
