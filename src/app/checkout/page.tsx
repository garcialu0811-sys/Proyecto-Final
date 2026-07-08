'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cartStore';
import {
  CreditCard, Banknote, ShoppingBag, ArrowLeft, Lock, CheckCircle,
  Package, Truck, MapPin, X,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const { items, getSubtotal, getShipping, getTotal, clearCart, guestCheckout, guestInfo } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'summary' | 'payment' | 'success'>('summary');
  const [orderNumber, setOrderNumber] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated' && !guestCheckout) {
      router.push('/login');
    }
  }, [status, router, guestCheckout]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session && !guestCheckout) return null;

  if (items.length === 0 && step !== 'success') {
    router.push('/store');
    return null;
  }

  const subtotal = getSubtotal();
  const shipping = getShipping();
  const total = getTotal();

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const validateCard = () => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.length < 13 || num.length > 19) return false;
    if (!cardExpiry || cardExpiry.length < 5) return false;
    if (!cardCvv || cardCvv.length < 3) return false;
    if (!cardName.trim()) return false;
    return true;
  };

  const handleSubmitOrder = async () => {
    if (paymentMethod === 'card' && !validateCard()) {
      showToast('Completa todos los campos de la tarjeta.', 'warning');
      return;
    }
    if (paymentMethod === 'cash' && !deliveryAddress.trim()) {
      showToast('Ingresa la direccion de entrega.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const orderData = guestCheckout && guestInfo
        ? {
            guestInfo,
            items: items.map(item => ({
              productId: item.productId,
              productName: item.name,
              productPrice: item.price,
              quantity: item.quantity,
              image: item.imageUrl,
            })),
            subtotal,
            shipping,
            total,
            paymentMethod: paymentMethod === 'card' ? 'CARD' : 'CASH_ON_DELIVERY',
            shippingAddress: paymentMethod === 'cash' ? deliveryAddress : '',
          }
        : {
            userId: user.id,
            items: items.map(item => ({
              productId: item.productId,
              productName: item.name,
              productPrice: item.price,
              quantity: item.quantity,
              image: item.imageUrl,
            })),
            subtotal,
            shipping,
            total,
            paymentMethod: paymentMethod === 'card' ? 'CARD' : 'CASH_ON_DELIVERY',
            shippingAddress: paymentMethod === 'cash' ? deliveryAddress : '',
            clientName: user.name,
          };

      const apiUrl = guestCheckout ? '/api/orders/guest' : '/api/orders';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderNumber(data.orderNumber);
        clearCart();
        setStep('success');
        showToast('Pedido confirmado exitosamente.', 'success');
      } else {
        const err = await res.json();
        showToast(err.message || 'Error al crear el pedido.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '48px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)' }} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Pedido confirmado</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Tu pedido ha sido registrado exitosamente.</p>

          <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Numero de pedido</span>
              <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>{orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Metodo de pago</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{paymentMethod === 'card' ? 'Tarjeta' : 'Contra entrega'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>Q{total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => router.push('/store')} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
              <ShoppingBag size={16} /> Seguir comprando
            </button>
            <button onClick={() => router.push('/')} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/store')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <ArrowLeft size={18} /> Volver a la tienda
          </button>
          <div style={{ flex: 1 }} />
          {guestCheckout && (
            <div style={{ padding: '6px 12px', backgroundColor: 'var(--warning-light, #fef3cd)', borderRadius: '6px', fontSize: '12px', color: '#856404' }}>
              Modo invitado
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success)' }}>
            <Lock size={14} /> Pago seguro
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={28} style={{ color: 'var(--accent)' }} />
          Finalizar compra
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          {/* Left: Payment */}
          <div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Metodo de pago
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <button onClick={() => setPaymentMethod('card')} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '10px',
                  border: paymentMethod === 'card' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: paymentMethod === 'card' ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: paymentMethod === 'card' ? 'var(--accent)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard size={22} style={{ color: paymentMethod === 'card' ? '#fff' : 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Pago en linea</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tarjeta de credito o debito</p>
                  </div>
                </button>

                <button onClick={() => setPaymentMethod('cash')} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '10px',
                  border: paymentMethod === 'cash' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: paymentMethod === 'cash' ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: paymentMethod === 'cash' ? 'var(--accent)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Banknote size={22} style={{ color: paymentMethod === 'cash' ? '#fff' : 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Contra entrega</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Paga en efectivo al recibir tu pedido</p>
                  </div>
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} style={{ color: 'var(--accent)' }} />
                    Datos de la tarjeta
                  </h3>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Numero de tarjeta</label>
                    <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456" maxLength={19}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', fontFamily: 'monospace', letterSpacing: '1px', color: 'var(--text-primary)' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Fecha exp.</label>
                      <input type="text" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/AA" maxLength={5}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', fontFamily: 'monospace', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>CVV</label>
                      <input type="text" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123" maxLength={4}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', fontFamily: 'monospace', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nombre del titular</label>
                    <input type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                      placeholder="Como aparece en la tarjeta"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }} />
                  </div>

                  <button onClick={handleSubmitOrder} disabled={loading || !validateCard()} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600 }}>
                    {loading ? 'Procesando...' : `Pagar Q${total.toFixed(2)}`}
                  </button>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--accent)' }} />
                   Direccion de entrega
                  </h3>

                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '3px solid var(--accent)' }}>
                    Pagas en efectivo al recibir tu pedido en la direccion indicada.
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Direccion completa</label>
                    <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder="Calle, numero, colonia, ciudad..."
                      rows={3}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', color: 'var(--text-primary)' }} />
                  </div>

                  <button onClick={handleSubmitOrder} disabled={loading || !deliveryAddress.trim()} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600 }}>
                    {loading ? 'Procesando...' : 'Confirmar pedido'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', position: 'sticky', top: '24px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: 'var(--accent)' }} />
                Resumen del pedido
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {items.map(item => (
                  <div key={item.productId} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--text-light)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>x{item.quantity}</p>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>Q{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>Q{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Envio</span>
                  <span style={{ color: shipping === 0 ? 'var(--success)' : 'var(--text-primary)', fontWeight: shipping === 0 ? 600 : 400 }}>
                    {shipping === 0 ? 'Gratis' : `Q${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping === 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--success)', marginBottom: '8px' }}>Envio gratis en compras mayores a Q200</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '18px', fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--accent)' }}>Q{total.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'var(--success-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Entrega estimada en 1-3 dias habiles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
