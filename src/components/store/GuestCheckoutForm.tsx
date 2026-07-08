'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, User, ShoppingCart } from 'lucide-react';
import { useCartStore, GuestInfo } from '@/lib/store/cartStore';

interface GuestCheckoutFormProps {
  onBack: () => void;
}

export default function GuestCheckoutForm({ onBack }: GuestCheckoutFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { addItem, setPendingProduct, setGuestCheckout, setGuestInfo, pendingProduct } = useCartStore();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const guestInfo: GuestInfo = { name, email, phone };
    setGuestInfo(guestInfo);
    setGuestCheckout(true);

    if (pendingProduct) {
      addItem(pendingProduct);
      setPendingProduct(null);
    }

    router.push('/checkout');
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '16px',
      maxWidth: '460px',
      width: '100%',
      padding: '32px',
      position: 'relative',
      boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: 700,
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <ShoppingCart size={22} style={{ color: 'var(--accent)' }} />
        Continuar como invitado
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Ingresa tus datos para continuar con la compra. Podras crear una cuenta despues.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nombre completo</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Tu nombre"
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '14px',
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Correo electronico</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '14px',
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Telefono</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              placeholder="1234-5678"
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '14px',
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}
        >
          {loading ? 'Procesando...' : 'Continuar con la compra'}
        </button>
      </form>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-light)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
        }}
      >
        Volver al inicio de sesion
      </button>
    </div>
  );
}
