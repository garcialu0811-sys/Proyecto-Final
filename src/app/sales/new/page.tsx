'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Plus, Minus, Trash2, X, Check, Camera,
  DollarSign, User, Phone, MapPin, UserPlus, Receipt,
  Save, Search, Package, Scan, RefreshCw, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
  stock: number;
}

interface Customer {
  name: string;
  phone: string;
  address: string;
}

export default function NuevaVentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', address: '' });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '', phone: '', address: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const searchRef = useRef<HTMLDivElement>(null);

  const totals = {
    items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    discount: discountType === 'percent' ? cartItems.reduce((sum, item) => sum + item.subtotal, 0) * (discount / 100) : discount,
    total: 0
  };
  totals.total = totals.subtotal - totals.discount;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, customer, totals]);

  const handleAddItem = (product: any) => {
    const existing = cartItems.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= (product.stock || 0)) {
        showToast('Stock insuficiente', 'warning');
        return;
      }
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: item.price * (item.quantity + 1) }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        sku: product.sku || product.qrCode || 'N/A',
        price: product.price,
        quantity: 1,
        subtotal: product.price,
        image: product.image,
        stock: product.stock || 0
      };
      setCartItems([...cartItems, newItem]);
    }
    showToast(`${product.name} agregado`, 'success');
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    const item = cartItems.find(i => i.id === itemId);
    if (item && newQuantity > item.stock) {
      showToast('Stock insuficiente', 'warning');
      return;
    }
    setCartItems(cartItems.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    try {
      const res = await fetch(`/api/products/public?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      setSearchResults(data.products || data || []);
      setShowSearch(true);
    } catch {
      setSearchResults([]);
    }
  };

  const handleScanQR = async (code: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/qr/${code}`);
      const data = await res.json();
      if (res.ok && data) {
        handleAddItem(data);
      } else {
        showToast('Producto no encontrado', 'error');
      }
    } catch {
      showToast('Error al buscar producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      showToast('Agrega al menos un producto', 'warning');
      return;
    }
    if (!customer.name) {
      showToast('Ingresa el nombre del cliente', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      for (const item of cartItems) {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            clientName: customer.name,
            clientPhone: customer.phone,
            clientAddress: customer.address
          })
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.message || 'Error al registrar venta', 'error');
          setIsSubmitting(false);
          return;
        }
      }
      showToast('Venta registrada exitosamente!', 'success');
      setCartItems([]);
      setCustomer({ name: '', phone: '', address: '' });
      setDiscount(0);
      router.push('/sales');
    } catch {
      showToast('Error al registrar la venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Nueva Venta</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registra una nueva venta agregando productos e informacion del cliente.</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/sales')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
        >
          <X size={16} />
          Cancelar Venta
        </button>
      </div>

      {/* Customer Info */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} style={{ color: 'var(--accent)' }} />
          Informacion del Cliente
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Cliente</label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="form-control"
                placeholder="Maria Gomez"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Telefono</label>
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="form-control"
                placeholder="555-123-4567"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Direccion</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="form-control"
                placeholder="Av. Juarez #456, Coatan, Ver."
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>
          <button
            onClick={() => setShowNewCustomerForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px dashed var(--accent)', borderRadius: '8px', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}
          >
            <Plus size={14} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Main Content - Products + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Products Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} style={{ color: 'var(--accent)' }} />
              Productos en la Venta
              {cartItems.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{cartItems.length}</span>
              )}
            </h2>
            <button
              onClick={() => {
                const code = prompt('Ingresa el codigo QR o SKU del producto:');
                if (code) handleScanQR(code);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px' }}
            >
              <Scan size={14} />
              Escanear QR
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }} ref={searchRef}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="form-control"
                placeholder="Buscar producto por nombre o codigo..."
                style={{ paddingLeft: '32px', fontSize: '13px' }}
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 10, marginTop: '4px', width: 'calc(100% - 32px)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflow: 'auto' }}>
                {searchResults.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      handleAddItem(product);
                      setSearchTerm('');
                      setSearchResults([]);
                      setShowSearch(false);
                    }}
                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatCurrency(product.price)} | Stock: {product.stock}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Producto</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Precio Unit.</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Cantidad</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Subtotal</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <ShoppingCart size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '14px' }}>No hay productos en esta venta</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Busca un producto o escanea un codigo QR</p>
                  </td>
                </tr>
              ) : (
                cartItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={18} style={{ color: 'var(--text-secondary)' }} />
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.productName}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', color: 'var(--text-primary)' }}>{formatCurrency(item.price)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.subtotal)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Scan prompt */}
          {cartItems.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <Plus size={14} />
              Sigue escaneando o agregando productos...
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card" style={{ padding: '20px', position: 'sticky', top: '80px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={16} style={{ color: 'var(--accent)' }} />
            Resumen de la Venta
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Productos</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{totals.items}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Subtotal</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(totals.subtotal)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Descuento</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                style={{ width: '70px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', textAlign: 'right', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                min="0"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                style={{ padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <option value="fixed">$</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Total a pagar</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(totals.total)}</span>
          </div>

          {/* Tip */}
          <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', marginBottom: '16px', border: '1px solid #dbeafe' }}>
            <p style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 500, marginBottom: '2px' }}>Consejo:</p>
            <p style={{ fontSize: '11px', color: '#3b82f6' }}>Puedes escanear codigos QR o buscar productos para agregarlos rapidamente.</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || cartItems.length === 0}
            style={{
              width: '100%', padding: '14px', background: cartItems.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
              cursor: isSubmitting || cartItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.2s'
            }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Procesando...
              </>
            ) : (
              <>
                <Save size={18} />
                Registrar Venta
              </>
            )}
          </button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Presiona F2 para registrar
          </p>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo Cliente</h2>
              <button onClick={() => setShowNewCustomerForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Nombre *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="form-control"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Telefono *</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="form-control"
                  placeholder="Telefono"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Direccion</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="form-control"
                  rows={2}
                  placeholder="Direccion"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowNewCustomerForm(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newCustomer.name && newCustomer.phone) {
                    setCustomer(newCustomer);
                    setShowNewCustomerForm(false);
                    setNewCustomer({ name: '', phone: '', address: '' });
                    showToast('Cliente agregado', 'success');
                  } else {
                    showToast('Nombre y telefono son obligatorios', 'warning');
                  }
                }}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .pos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
