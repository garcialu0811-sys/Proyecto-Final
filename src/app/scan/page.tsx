'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Camera, ShoppingBag, Save, Check, Clock, Trash2, Edit3, X,
  AlertTriangle, Package, Plus, DollarSign, BoxSelect, Hash, FileText,
} from 'lucide-react';
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
  minStock?: number;
}

interface ScanHistoryItem {
  productId: string;
  productName: string;
  action: string;
  timestamp: string;
  details?: string;
}

export default function ScanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scannedReceipt, setScannedReceipt] = useState<any>(null);

  const [manualCode, setManualCode] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

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
  const [editModalMinStock, setEditModalMinStock] = useState('5');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Perifericos');
  const [newProductMinStock, setNewProductMinStock] = useState('5');

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

  const addToHistory = (productId: string, productName: string, action: string, details?: string) => {
    const item: ScanHistoryItem = { productId, productName, action, timestamp: new Date().toISOString(), details };
    const updated = [item, ...scanHistory].slice(0, 50);
    setScanHistory(updated);
    localStorage.setItem('qrshop-scan-history', JSON.stringify(updated));
  };

  const clearHistory = () => { setScanHistory([]); localStorage.removeItem('qrshop-scan-history'); showToast('Historial limpiado.', 'info'); };

  const getStockStatus = (stock: number, minStock?: number) => {
    const min = minStock || 5;
    if (stock === 0) return { label: 'Sin stock', color: '#DC2626', bg: '#FEE2E2' };
    if (stock <= min) return { label: 'Stock bajo', color: '#D97706', bg: '#FEF3C7' };
    if (stock <= min * 2) return { label: 'Stock medio', color: '#2563EB', bg: '#DBEAFE' };
    return { label: 'Stock alto', color: '#059669', bg: '#D1FAE5' };
  };

  const handleScanSuccess = async (code: string) => {
    const now = Date.now();
    if (code === lastScanRef.current.code && now - lastScanRef.current.time < 3000) return;
    lastScanRef.current = { code, time: now };

    setLoadingSearch(true);
    try {
      // Check if scanned code is a receipt QR URL
      if (code.includes('/api/sales/folio/')) {
        const folio = code.split('/api/sales/folio/')[1];
        if (folio) {
          const res = await fetch(`/api/sales/folio/${folio}`);
          if (res.ok) {
            const data = await res.json();
            setScannedProduct(null);
            setScannedReceipt(data);
            addToHistory(folio, `Recibo ${folio}`, 'Recibo escaneado', `Total: Q${data.total?.toFixed(2)}`);
            showToast(`Recibo encontrado: ${data.folio}`, 'success');
            setLoadingSearch(false);
            return;
          }
        }
      }

      // Try product lookup
      const res = await fetch(`/api/products/qr/${code}`);
      const data = await res.json();
      if (res.ok) {
        setScannedProduct(data);
        setScannedReceipt(null);
        setEditPrice(data.price.toString());
        setEditStock(data.stock.toString());
        setSellQty('1');
        addToHistory(data.id, data.name, 'Escaneado');
        showToast(`Producto encontrado: ${data.name}`, 'success');
      } else {
        showToast('Codigo no registrado.', 'error');
      }
    } catch { showToast('Error al buscar.', 'error'); }
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
      if (res.ok) {
        setScannedProduct(data);
        addToHistory(data.id, data.name, 'Stock/Precio ajustado', `Precio: $${editPrice}, Stock: ${editStock}`);
        showToast('Producto actualizado.', 'success');
      }
      else { showToast(data.message || 'Error al actualizar.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
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
        const total = scannedProduct.price * Number(sellQty);
        addToHistory(scannedProduct.id, scannedProduct.name, `Venta registrada`, `x${sellQty} - Q${total.toFixed(2)} - ${clientName || 'Cliente general'}`);
        showToast('Venta realizada con exito.', 'success');
        handleScanSuccess(scannedProduct.id);
        setSellQty('1'); setClientName('');
      } else { showToast(data.message || 'Error al vender.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteProduct = async () => {
    if (!scannedProduct || role !== 'ADMIN') return;
    if (!confirm(`Eliminar "${scannedProduct.name}"? Esta accion no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/products/${scannedProduct.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToHistory(scannedProduct.id, scannedProduct.name, 'Producto eliminado');
        showToast('Producto eliminado.', 'success');
        setScannedProduct(null);
      }
      else { showToast('Error al eliminar.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
  };

  const handleOpenEditModal = () => {
    if (!scannedProduct) return;
    setEditModalName(scannedProduct.name);
    setEditModalDesc(scannedProduct.description);
    setEditModalPrice(scannedProduct.price.toString());
    setEditModalStock(scannedProduct.stock.toString());
    setEditModalCategory(scannedProduct.category);
    setEditModalMinStock(scannedProduct.minStock?.toString() || '5');
    setShowEditModal(true);
  };

  const handleSaveEditModal = async () => {
    if (!scannedProduct) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/products/${scannedProduct.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editModalName, description: editModalDesc,
          price: Number(editModalPrice), stock: Number(editModalStock),
          category: editModalCategory, minStock: Number(editModalMinStock)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setScannedProduct(data);
        setShowEditModal(false);
        addToHistory(data.id, data.name, 'Edicion completa', `Nombre: ${editModalName}, Precio: $${editModalPrice}, Stock: ${editModalStock}`);
        showToast('Producto actualizado.', 'success');
      }
      else { showToast(data.message || 'Error.', 'error'); }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductStock) {
      showToast('Completa los campos obligatorios.', 'warning'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName, description: newProductDesc || newProductName,
          price: Number(newProductPrice), stock: Number(newProductStock),
          category: newProductCategory, minStock: Number(newProductMinStock) || 5
        })
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
        addToHistory(data.id, data.name, 'Producto creado', `Precio: $${newProductPrice}, Stock: ${newProductStock}`);
        showToast('Producto creado exitosamente.', 'success');
        setShowAddModal(false);
        setNewProductName(''); setNewProductDesc(''); setNewProductPrice('');
        setNewProductStock(''); setNewProductCategory('Perifericos'); setNewProductMinStock('5');
        if (data.id) handleScanSuccess(data.id);
      } else {
        showToast(data.message || 'Error al crear producto.', 'error');
      }
    } catch { showToast('Error de conexion.', 'error'); }
    finally { setActionLoading(false); }
  };

  const stockStatus = scannedProduct ? getStockStatus(scannedProduct.stock, scannedProduct.minStock) : null;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Escanear Codigos QR</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Escanea productos para vender, editar o verificar stock.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {role === 'ADMIN' && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
              <Plus size={16} /> Agregar Producto
            </button>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className="btn btn-secondary" style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
            <Clock size={16} />
            <span>Historial ({scanHistory.length})</span>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Historial de Actividad
            </h3>
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
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '13px' }}>Sin actividad reciente.</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {scanHistory.map((item, idx) => (
                <div key={idx} style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13px', gap: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{item.productName}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: item.action.includes('Venta') ? '#D1FAE5' :
                          item.action.includes('eliminado') ? '#FEE2E2' :
                          item.action.includes('creado') ? '#DBEAFE' : '#FEF3C7',
                        color: item.action.includes('Venta') ? '#059669' :
                          item.action.includes('eliminado') ? '#DC2626' :
                          item.action.includes('creado') ? '#2563EB' : '#D97706'
                      }}>
                        {item.action}
                      </span>
                    </div>
                    {item.details && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.details}</p>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                    {new Date(item.timestamp).toLocaleString('es-ES')}
                  </span>
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
          ) : scannedReceipt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: '#059669' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#059669' }}>Recibo Escaneado</span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>{scannedReceipt.folio}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>{scannedReceipt.date}</span>
                  <span>{scannedReceipt.time}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vendedor: <strong style={{ color: 'var(--text-primary)' }}>{scannedReceipt.sellerName}</strong></p>
              </div>
              <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Cant.</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedReceipt.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>{item.productName}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Q{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--accent)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-contrast)' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-contrast)' }}>Q{scannedReceipt.total.toFixed(2)}</span>
              </div>
            </div>
          ) : !scannedProduct ? (
            <div style={{ padding: '60px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Camera size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Esperando Lectura</p>
              <p style={{ fontSize: '12px' }}>Escanea un QR o introduce un ID.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={scannedProduct.imageUrl || '/no-image.png'} alt={scannedProduct.name}
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{scannedProduct.name}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span className="role-tag vendedor" style={{ fontSize: '11px' }}>{scannedProduct.category}</span>
                    {stockStatus && (
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: stockStatus.bg, color: stockStatus.color
                      }}>
                        {stockStatus.label}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <DollarSign size={12} style={{ display: 'inline' }} />Q{scannedProduct.price.toFixed(2)}
                    <span style={{ margin: '0 6px', color: 'var(--border)' }}>|</span>
                    <Package size={12} style={{ display: 'inline' }} />{scannedProduct.stock} unidades
                  </p>
                </div>
              </div>

              {scannedProduct.stock <= (scannedProduct.minStock || 5) && scannedProduct.stock > 0 && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', borderLeft: '4px solid #D97706', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#92400E' }}>Stock bajo. Minimo recomendado: {scannedProduct.minStock || 5} unidades.</span>
                </div>
              )}
              {scannedProduct.stock === 0 && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#991B1B' }}>Sin stock disponible. Reabastecer urgentemente.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button onClick={handleOpenEditModal} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}>
                  <Edit3 size={12} /> Editar
                </button>
                {role === 'ADMIN' && (
                  <button onClick={handleDeleteProduct} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: 'var(--danger)' }}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>

              <form onSubmit={handleQuickEdit} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> Ajuste Rapido
                </h4>
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

              <form onSubmit={handleQuickSell} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} /> Registrar Venta
                </h4>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Cantidad</label>
                    <input type="number" min="1" max={scannedProduct.stock} className="form-control" value={sellQty} onChange={e => setSellQty(e.target.value)} disabled={actionLoading} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Cliente</label>
                    <input type="text" placeholder="Nombre (opcional)" className="form-control" value={clientName} onChange={e => setClientName(e.target.value)} disabled={actionLoading} />
                  </div>
                </div>
                {Number(sellQty) > 0 && scannedProduct.price > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Total: <strong style={{ color: 'var(--success)' }}>Q{(scannedProduct.price * Number(sellQty)).toFixed(2)}</strong>
                  </p>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', gap: '4px' }} disabled={actionLoading || scannedProduct.stock <= 0}>
                  <Check size={14} /> {scannedProduct.stock <= 0 ? 'Sin stock' : 'Registrar Venta'}
                </button>
              </form>
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
              <label className="form-label">Descripcion</label>
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-control" value={editModalCategory} onChange={e => setEditModalCategory(e.target.value)}>
                  <option value="Perifericos">Perifericos</option>
                  <option value="Monitores">Monitores</option>
                  <option value="Componentes">Componentes</option>
                  <option value="Audio">Audio</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Minimo</label>
                <input type="number" className="form-control" value={editModalMinStock} onChange={e => setEditModalMinStock(e.target.value)} />
              </div>
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} /> Agregar Nuevo Producto
              </h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" className="form-control" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nombre del producto" required />
              </div>
              <div className="form-group">
                <label className="form-label">Descripcion</label>
                <textarea className="form-control" rows={2} value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} placeholder="Descripcion breve" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Precio ($) *</label>
                  <input type="number" step="0.01" className="form-control" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Inicial *</label>
                  <input type="number" className="form-control" value={newProductStock} onChange={e => setNewProductStock(e.target.value)} placeholder="0" required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-control" value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)}>
                    <option value="Perifericos">Perifericos</option>
                    <option value="Monitores">Monitores</option>
                    <option value="Componentes">Componentes</option>
                    <option value="Audio">Audio</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Minimo</label>
                  <input type="number" className="form-control" value={newProductMinStock} onChange={e => setNewProductMinStock(e.target.value)} placeholder="5" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Creando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
