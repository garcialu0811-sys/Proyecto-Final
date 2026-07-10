'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, ShoppingCart, Plus, Search, Package,
  MapPin, Camera, X, Save,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/components/ui/ToastContext';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const role = currentUser?.role || 'VENDEDOR';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'sales-qr-reader';

  const fireConfetti = async () => {
    try {
      const mod = await import('canvas-confetti');
      mod.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch {}
  };

  const startCameraScanner = async () => {
    try {
      if (scannerRef.current) return;
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleCameraScanSuccess(decodedText);
          stopCameraScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera scanner error:', err);
      showToast('No se pudo acceder a la camara. Usa la entrada manual.', 'error');
      setUseCamera(false);
    }
  };

  const stopCameraScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
  };

  const handleCameraScanSuccess = async (code: string) => {
    try {
      const res = await fetch(`/api/products/qr/${code}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedProductId(data.id);
        showToast(`Producto encontrado: ${data.name}`, 'success');
      } else {
        showToast('Codigo QR no encontrado.', 'error');
      }
    } catch {
      showToast('Error al buscar producto.', 'error');
    }
  };

  useEffect(() => {
    return () => { stopCameraScanner(); };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      showToast('Error al obtener productos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (role !== 'ADMIN' && role !== 'VENDEDOR') { showToast('Acceso restringido.', 'error'); router.push('/'); return; }
      fetchData();
    }
  }, [session, status]);

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !qty || Number(qty) <= 0) { showToast('Selecciona producto y cantidad.', 'warning'); return; }
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) { showToast('Producto invalido.', 'error'); return; }
    if (prod.stock < Number(qty)) { showToast(`Stock insuficiente. Disponibles: ${prod.stock}`, 'error'); return; }

    setFormLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, quantity: Number(qty), clientName: clientName || 'Venta de Mostrador', clientPhone, clientAddress }),
      });
      const data = await res.json();
      if (res.ok) {
        fireConfetti();
        showToast('Venta registrada con exito.', 'success');
        setSelectedProductId(''); setQty('1'); setClientName(''); setClientPhone(''); setClientAddress(''); setScannedId('');
        fetchData();
      } else {
        showToast(data.message || 'Error al registrar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSimulateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedId) return;
    try {
      const res = await fetch(`/api/products/qr/${scannedId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedProductId(data.id);
        showToast(`Producto: ${data.name}. Stock: ${data.stock}`, 'success');
      } else {
        showToast('Codigo no encontrado.', 'error');
      }
    } catch {
      showToast('Error al buscar codigo.', 'error');
    }
  };

  const activeProduct = products.find(p => p.id === selectedProductId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={28} style={{ color: 'var(--accent)' }} />
            Ventas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Registra ventas escaneando codigo QR del producto.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent)' }} />
            Registrar Venta Escaneando QR
          </h2>

          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Camera size={16} style={{ color: 'var(--accent)' }} />
                Escanear codigo del producto
              </p>
              <button
                type="button"
                onClick={async () => {
                  const next = !useCamera;
                  setUseCamera(next);
                  if (next) {
                    setTimeout(() => startCameraScanner(), 100);
                  } else {
                    await stopCameraScanner();
                  }
                }}
                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--accent)', background: useCamera ? 'var(--accent)' : 'transparent', color: useCamera ? '#fff' : 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
              >
                {useCamera ? 'Usar entrada manual' : 'Usar camara'}
              </button>
            </div>

            {useCamera ? (
              <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', minHeight: '250px' }}>
                <div id={scannerContainerId} style={{ width: '100%' }} />
              </div>
            ) : (
              <form onSubmit={handleSimulateScan} style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="form-control" placeholder="Ingresa el codigo QR o ID del producto" value={scannedId} onChange={e => setScannedId(e.target.value)} disabled={formLoading} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-secondary" style={{ padding: '10px 16px' }} disabled={formLoading}>Escanear</button>
              </form>
            )}
          </div>

          <form onSubmit={handleRegisterSale}>
            <div className="form-group">
              <label className="form-label">Seleccionar Producto *</label>
              <select className="form-control" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} disabled={formLoading} required>
                <option value="">-- Elige un articulo --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} - Q{p.price.toFixed(2)} ({p.stock} uds) {p.stock <= 0 ? '(Agotado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {activeProduct && (
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                <p style={{ margin: '2px 0' }}>Categoria: <strong>{activeProduct.category}</strong></p>
                <p style={{ margin: '2px 0' }}>Precio: <strong>Q{activeProduct.price.toFixed(2)}</strong></p>
                <p style={{ margin: '2px 0' }}>Disponibles: <strong style={{ color: activeProduct.stock <= 3 ? 'var(--danger)' : 'inherit' }}>{activeProduct.stock} uds</strong></p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group" style={{ maxWidth: '150px', marginBottom: 0 }}>
                <label className="form-label">Cantidad *</label>
                <input type="number" min="1" max={activeProduct ? activeProduct.stock : 100} className="form-control" value={qty} onChange={e => setQty(e.target.value)} disabled={formLoading} required />
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} style={{ color: 'var(--accent)' }} />
              Datos del Cliente (Opcional)
            </h3>

            <div className="form-group">
              <label className="form-label">Nombre del Cliente</label>
              <input type="text" className="form-control" placeholder="Maria Gomez" value={clientName} onChange={e => setClientName(e.target.value)} disabled={formLoading} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Telefono</label>
                <input type="text" className="form-control" placeholder="555-1234" value={clientPhone} onChange={e => setClientPhone(e.target.value)} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label className="form-label">Direccion</label>
                <input type="text" className="form-control" placeholder="Av. Juarez #456" value={clientAddress} onChange={e => setClientAddress(e.target.value)} disabled={formLoading} />
              </div>
            </div>

            {activeProduct && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total:</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>Q{(activeProduct.price * Number(qty || 0)).toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> {formLoading ? 'Registrando...' : 'Registrar Venta'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
