'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Plus, Minus, Trash2, X,
  DollarSign, User, Phone, MapPin, Receipt,
  Save, Search, Package, Scan, RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { QRScanner } from '@/components/pos/QRScanner';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState({ items: 0, subtotal: 0, discount: 0, total: 0 });
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', address: '' });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '', phone: '', address: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastCartHashRef = useRef<string>('');
  const discountRef = useRef(0);
  const discountTypeRef = useRef<'fixed' | 'percent'>('fixed');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Create POS session on mount (or reuse existing)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const initSession = async () => {
      try {
        const res = await fetch('/api/pos/session', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setSessionId(data.session.sessionId);
          // Load existing items if session was reused
          if (data.items && data.items.length > 0) {
            setCartItems(data.items);
            const t = data.totals || { subtotal: 0, total: 0, itemCount: 0, totalItems: 0 };
            const disc = discountTypeRef.current === 'percent'
              ? t.subtotal * (discountRef.current / 100)
              : discountRef.current;
            setTotals({
              items: t.totalItems,
              subtotal: t.subtotal,
              discount: disc,
              total: t.subtotal - disc,
            });
          }
        } else {
          showToast(data.error || 'Error al crear sesion', 'error');
        }
      } catch {
        showToast('Error al inicializar sesion', 'error');
      }
    };
    initSession();
  }, [status, showToast]);

  // Polling: fetch cart every 2 seconds (NO discount dependency to avoid restarts)
  const fetchCart = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/pos/cart/${sid}`);
      const data = await res.json();
      if (data.success) {
        // Another device completed the sale — session closed
        if (data.sessionClosed && data.saleCompletedAt) {
          showToast('Venta registrada en otro dispositivo. Iniciando nueva venta...', 'success');
          setCartItems([]);
          setTotals({ items: 0, subtotal: 0, discount: 0, total: 0 });
          setDiscount(0);
          setShowQRScanner(false);
          lastCartHashRef.current = '';
          // Create a new session
          try {
            const sessionRes = await fetch('/api/pos/session', { method: 'POST' });
            const sessionData = await sessionRes.json();
            if (sessionData.success) {
              setSessionId(sessionData.session.sessionId);
            }
          } catch { /* ignore */ }
          return;
        }

        const newItems: CartItem[] = data.items || [];
        const newHash = JSON.stringify(newItems.map((i: CartItem) => `${i.productId}:${i.quantity}`).sort());

        // Only update state if cart actually changed
        if (newHash !== lastCartHashRef.current) {
          lastCartHashRef.current = newHash;
          setCartItems(newItems);

          const t = data.totals || { subtotal: 0, total: 0, itemCount: 0, totalItems: 0 };
          const disc = discountTypeRef.current === 'percent'
            ? t.subtotal * (discountRef.current / 100)
            : discountRef.current;
          setTotals({
            items: t.totalItems,
            subtotal: t.subtotal,
            discount: disc,
            total: t.subtotal - disc,
          });
        }
      }
    } catch {
      // Silently fail polling
    }
  }, [showToast]);

  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    fetchCart(sessionId);

    // Start polling every 2 seconds
    pollingRef.current = setInterval(() => {
      fetchCart(sessionId);
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sessionId, fetchCart]);

  // Recalculate totals when discount changes
  useEffect(() => {
    discountRef.current = discount;
    discountTypeRef.current = discountType;
    if (cartItems.length === 0) return;
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const disc = discountType === 'percent' ? subtotal * (discount / 100) : discount;
    setTotals(prev => ({
      ...prev,
      subtotal,
      discount: disc,
      total: subtotal - disc,
    }));
  }, [discount, discountType, cartItems]);

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

  // QR Scan handler - sends productId to server
  const handleScanQR = useCallback(async (code: string) => {
    if (!sessionId) {
      showToast('No hay sesion activa', 'error');
      return;
    }

    // Extract product ID from QR code (accept PROD: prefix or raw ID)
    let productId = code;
    if (code.startsWith('PROD:')) {
      productId = code.replace('PROD:', '');
    }

    try {
      const lookupRes = await fetch(`/api/products/qr/${productId}`);
      const product = await lookupRes.json();

      if (!lookupRes.ok || !product?.id) {
        showToast('Producto no encontrado', 'error');
        return;
      }

      // Add to server cart
      const res = await fetch('/api/pos/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, productId: product.id }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        fetchCart(sessionId);
      } else {
        showToast(data.error || 'Error al agregar producto', 'error');
      }
    } catch {
      showToast('Error al buscar producto', 'error');
    }
  }, [sessionId, fetchCart, showToast]);

  // Add item from search - sends to server
  const handleAddItem = async (product: any) => {
    if (!sessionId) {
      showToast('No hay sesion activa', 'error');
      return;
    }

    try {
      const res = await fetch('/api/pos/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, productId: product.id }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        fetchCart(sessionId);
      } else {
        showToast(data.error || 'Error al agregar producto', 'error');
      }
    } catch {
      showToast('Error al agregar producto', 'error');
    }
  };

  // Update quantity via server
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (!sessionId) return;

    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }

    try {
      const res = await fetch(`/api/pos/cart/${sessionId}/update/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (res.ok) {
        fetchCart(sessionId);
      }
    } catch {
      showToast('Error al actualizar cantidad', 'error');
    }
  };

  // Remove item via server
  const handleRemoveItem = async (itemId: string) => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/pos/cart/${sessionId}/remove/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Producto eliminado', 'success');
        fetchCart(sessionId);
      }
    } catch {
      showToast('Error al eliminar producto', 'error');
    }
  };

  // Search products
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

  // Submit sale
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
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
          })),
          clientName: customer.name,
          clientPhone: customer.phone,
          clientAddress: customer.address,
          discount: totals.discount,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Error al registrar venta', 'error');
        setIsSubmitting(false);
        return;
      }
      showToast('Venta registrada exitosamente!', 'success');
      const data = await res.json();
      const itemsParam = encodeURIComponent(JSON.stringify(cartItems.map(i => ({
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal,
        image: i.image,
      }))));
      const params = new URLSearchParams({
        items: itemsParam,
        subtotal: totals.subtotal.toFixed(2),
        discount: totals.discount.toFixed(2),
        total: totals.total.toFixed(2),
        customer: customer.name,
        folio: data.folio || '',
      });
      setCartItems([]);
      setCustomer({ name: '', phone: '', address: '' });
      setDiscount(0);
      router.push(`/sales/confirmation?${params.toString()}`);
    } catch {
      showToast('Error al registrar la venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => `Q${val.toFixed(2)}`;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '16px' : '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
          <div style={{ width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={isMobile ? 18 : 20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Nueva Venta</h1>
            {!isMobile && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registra una nueva venta agregando productos e informacion del cliente.</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {sessionId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              Sesion activa
            </div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="card" style={{ marginBottom: isMobile ? '12px' : '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} style={{ color: 'var(--accent)' }} />
          Informacion del Cliente
        </h2>
        <div className="pos-customer-grid">
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '12px' : '8px 14px', border: '1px dashed var(--accent)', borderRadius: '8px', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', minHeight: isMobile ? '44px' : 'auto' }}
          >
            <Plus size={14} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Main Content - Products + Summary */}
      <div className="pos-grid">
        {/* Products Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="pos-product-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Package size={16} style={{ color: 'var(--accent)' }} />
              Productos en la Venta
              {cartItems.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{cartItems.length}</span>
              )}
            </h2>
            <button
              onClick={() => setShowQRScanner(true)}
              disabled={!sessionId}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '12px 16px' : '6px 12px', border: '1px solid var(--accent)', borderRadius: '8px', background: isMobile ? 'var(--accent)' : 'var(--bg-secondary)', color: isMobile ? '#fff' : 'var(--text-primary)', cursor: !sessionId ? 'not-allowed' : 'pointer', fontSize: isMobile ? '14px' : '12px', fontWeight: 500, minHeight: isMobile ? '44px' : 'auto', opacity: !sessionId ? 0.5 : 1 }}
            >
              <Scan size={isMobile ? 18 : 14} />
              {isMobile ? 'Escanear QR' : 'Escanear QR'}
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }} ref={searchRef}>
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
              <div style={{ position: 'absolute', zIndex: 20, left: '16px', right: '16px', marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflow: 'auto' }}>
                {searchResults.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      handleAddItem(product);
                      setSearchTerm('');
                      setSearchResults([]);
                      setShowSearch(false);
                    }}
                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {(product.imageUrl || product.image) ? (
                        <img src={product.imageUrl || product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={18} style={{ color: 'var(--text-secondary)' }} />
                      )}
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
          <div className="pos-table-wrapper">
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
                            className={isMobile ? 'pos-touch-btn' : ''}
                            style={{ width: isMobile ? '36px' : '28px', height: isMobile ? '36px' : '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className={isMobile ? 'pos-touch-btn' : ''}
                            style={{ width: isMobile ? '36px' : '28px', height: isMobile ? '36px' : '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.subtotal)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className={isMobile ? 'pos-touch-btn danger' : ''}
                          style={{ width: isMobile ? '36px' : '28px', height: isMobile ? '36px' : '28px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Scan prompt */}
          {cartItems.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <Plus size={14} />
              Sigue escaneando o agregando productos...
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card" style={{ padding: isMobile ? '16px' : '20px', position: isMobile ? 'static' : 'sticky', top: isMobile ? 'auto' : '80px' }}>
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
                <option value="fixed">Q</option>
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
            <p style={{ fontSize: '11px', color: '#3b82f6' }}>El carrito se sincroniza automaticamente. Escanea desde cualquier dispositivo.</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || cartItems.length === 0}
            style={{
              width: '100%', padding: isMobile ? '16px' : '14px', background: cartItems.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: '#fff', border: 'none', borderRadius: '10px', fontSize: isMobile ? '16px' : '15px', fontWeight: 600,
              cursor: isSubmitting || cartItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.2s',
              minHeight: isMobile ? '52px' : 'auto'
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
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: isMobile ? '20px' : '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
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
                style={{ flex: 1, padding: isMobile ? '14px' : '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto' }}
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
                style={{ flex: 1, padding: isMobile ? '14px' : '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, minHeight: isMobile ? '48px' : 'auto' }}
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onScanSuccess={handleScanQR}
        onClose={() => setShowQRScanner(false)}
      />

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
