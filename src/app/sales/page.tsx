'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, ShoppingCart, Plus, Search, Package, Truck, Check,
  UserPlus, MapPin, Phone, User, Calendar, Layers, ArrowRight, Camera, X, Save,
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

interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  status: 'PENDIENTE' | 'PROCESANDO' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  driverId?: string;
  driverName?: string;
  createdAt: string;
}

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const role = currentUser?.role || 'CLIENTE';

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [showRegisterForm, setShowRegisterForm] = useState(false);
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
        scannerRef.current.clear();
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
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/products?limit=1000'),
      ]);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      if (role === 'ADMIN') {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setDrivers((usersData.users || []).filter((u: any) => u.role === 'VENDEDOR' || u.role === 'ADMIN'));
        }
      } else {
        setDrivers([{ id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role }]);
      }
    } catch {
      showToast('Error al obtener datos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [role, currentUser]);

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
        setShowRegisterForm(false);
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

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) { showToast(`Estado: ${nextStatus.replace('_', ' ')}.`, 'success'); fetchData(); }
    } catch { showToast('Error de conexion.', 'error'); }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id, driverName: driver.name, status: 'PROCESANDO' }),
      });
      if (res.ok) { showToast(`Asignado a ${driver.name}.`, 'success'); fetchData(); }
    } catch { showToast('Error de conexion.', 'error'); }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = !search || o.clientName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    if (!matchSearch || !matchStatus) return false;

    if (role === 'VENDEDOR') {
      const isMine = o.driverId === currentUser.id || o.driverName === currentUser.name;
      const isUnassigned = !o.driverId;
      if (o.status === 'ENTREGADO' || o.status === 'CANCELADO') {
        return isMine;
      }
      return isMine || isUnassigned;
    }
    return true;
  });

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
            Registra ventas escaneando QR y administra las rutas de reparto.
          </p>
        </div>
        <button onClick={() => setShowRegisterForm(!showRegisterForm)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
          {showRegisterForm ? <><X size={18} /> Ver Pedidos</> : <><Plus size={18} /> Registrar Venta</>}
        </button>
      </div>

      {showRegisterForm ? (
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
                Informacion de Entrega (Opcional)
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
                <button type="button" onClick={() => setShowRegisterForm(false)} className="btn btn-secondary" disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {formLoading ? 'Registrando...' : 'Registrar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input type="text" className="form-control" placeholder="Buscar por cliente o ID..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSearch(e.target.value); }} style={{ paddingLeft: '36px', height: '40px' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['', 'PENDIENTE', 'PROCESANDO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '50px', whiteSpace: 'nowrap' }}>
                    {s === '' ? 'Todos' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando ventas...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card" style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Package size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay pedidos</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Registra tu primera venta para comenzar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredOrders.map(order => (
                <div key={order.id} className="card" style={{ borderLeft: '4px solid var(--accent)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge ${order.status.toLowerCase()}`}>{order.status.replace('_', ' ')}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', fontFamily: 'monospace' }}>#{order.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString('es-GT')}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '4px' }}>PRODUCTO</p>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{order.productName}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.quantity} x Q{order.price.toFixed(2)} = <strong>Q{order.total.toFixed(2)}</strong></p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '4px' }}>CLIENTE</p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{order.clientName}</p>
                      {order.clientPhone && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} /> {order.clientPhone}</p>}
                      {order.clientAddress && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} /> {order.clientAddress}</p>}
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '4px' }}>REPARTIDOR</p>
                      {order.driverId ? (
                        <p style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} style={{ color: 'var(--accent)' }} /> {order.driverName}</p>
                      ) : (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--warning)', fontStyle: 'italic', marginBottom: '4px' }}>Sin asignar</p>
                          {role === 'ADMIN' ? (
                            <select className="form-control" style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }} onChange={e => handleAssignDriver(order.id, e.target.value)} defaultValue="">
                              <option value="" disabled>-- Asignar --</option>
                              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          ) : (
                            <button onClick={() => handleAssignDriver(order.id, currentUser.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <UserPlus size={12} /> Tomar Entrega
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    {order.status === 'PENDIENTE' && role === 'ADMIN' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'PROCESANDO')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Procesar</button>
                    )}
                    {order.status === 'PENDIENTE' && role === 'VENDEDOR' && !order.driverId && (
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>Esperando asignacion...</span>
                    )}
                    {order.status === 'PROCESANDO' && order.driverId === currentUser.id && (
                      <button onClick={() => handleUpdateStatus(order.id, 'EN_RUTA')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Truck size={14} /> En Ruta
                      </button>
                    )}
                    {order.status === 'PROCESANDO' && order.driverId === currentUser.id && (
                      <button onClick={() => handleUpdateStatus(order.id, 'ENTREGADO')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Entregado
                      </button>
                    )}
                    {order.status === 'PROCESANDO' && role === 'ADMIN' && !order.driverId && (
                      <span style={{ fontSize: '12px', color: 'var(--warning)', fontStyle: 'italic' }}>Asigna un repartidor</span>
                    )}
                    {order.status === 'EN_RUTA' && order.driverId === currentUser.id && (
                      <button onClick={() => handleUpdateStatus(order.id, 'ENTREGADO')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Entregado
                      </button>
                    )}
                    {order.status !== 'ENTREGADO' && order.status !== 'CANCELADO' && role === 'ADMIN' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'CANCELADO')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>Cancelar</button>
                    )}
                    {order.status === 'ENTREGADO' && (
                      <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Entregado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
