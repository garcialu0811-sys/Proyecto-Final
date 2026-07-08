'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, Package, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import ClientLayout from '@/components/store/ClientLayout';
import { useFavoritesStore } from '@/lib/store/favoritesStore';

export default function FavoritosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { items: favorites, removeFavorite } = useFavoritesStore();

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); }
  }, [status, router]);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    showToast('Eliminado de favoritos.', 'success');
  };

  return (
    <ClientLayout title="Favoritos" subtitle="Tus productos guardados.">
      {status === 'loading' ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : favorites.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <Heart size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay favoritos</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Aun no has guardado ningun producto como favorito.</p>
          <button onClick={() => router.push('/store?view=products')} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            <ShoppingBag size={16} /> Explorar productos
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {favorites.map(fav => (
            <div key={fav.productId} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fav.imageUrl ? <img src={fav.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={24} style={{ color: 'var(--text-light)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>Q{fav.price.toFixed(2)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => router.push('/store?view=products')} className="btn btn-primary" style={{ flex: 1, fontSize: '13px', padding: '8px' }}>
                  <ShoppingBag size={14} /> Ver producto
                </button>
                <button onClick={() => handleRemove(fav.productId)} className="btn btn-secondary" style={{ padding: '8px 12px', color: 'var(--danger)' }}>
                  <Heart size={14} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}
