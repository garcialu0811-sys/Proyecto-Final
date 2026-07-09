'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, ShoppingCart, User, X, ChevronLeft, ChevronRight,
  Package, MessageSquare, Truck, Tag, CheckCircle,
  ShoppingBag, Menu, Heart, ChevronDown, LogOut, Settings,
  Home, FolderOpen, Coffee, Watch, Laptop, Pen, Trophy, Gift, PawPrint,
  ShieldCheck, BadgeCheck, Headphones, CreditCard, Star, ArrowRight,
  Box, Armchair, Dumbbell, Palette, Baby,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useFavoritesStore } from '@/lib/store/favoritesStore';
import { useToast } from '@/components/ui/ToastContext';
import LoginModal from '@/components/store/LoginModal';
import ClientSidebar from '@/components/store/ClientSidebar';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  imageUrl: string;
  isActive: boolean;
}

interface CategoryData { name: string; count: number; icon: string; color: string; }

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Coffee, Watch, Laptop, Pen, Home, Trophy, Gift, PawPrint, Tag,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Bebidas': '#8B5CF6', 'Accesorios': '#F59E0B', 'Electrónicos': '#3B82F6',
  'Papelería': '#10B981', 'Hogar': '#EF4444',
};

function StorePageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const user = session?.user as any;
  const cart = useCartStore();
  const favorites = useFavoritesStore();

  const viewParam = searchParams.get('view') || 'inicio';
  const categoryParam = searchParams.get('category') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('popular');
  const [availability, setAvailability] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [filters, setFilters] = useState({ totalProducts: 0, availableCount: 0, outOfStockCount: 0 });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '8', sortBy });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      if (availability) params.set('availability', availability);
      if (maxPrice < 500) params.set('maxPrice', maxPrice.toString());
      const res = await fetch(`/api/products/public?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setCategories(data.categories);
        setFilters(data.filters);
        setPagination(data.pagination);
      }
    } catch { showToast('Error al cargar productos.', 'error'); }
    finally { setLoading(false); }
  }, [page, search, selectedCategory, sortBy, availability, maxPrice]);

  useEffect(() => { if (viewParam === 'products' || viewParam === 'inicio') fetchProducts(); }, [fetchProducts, viewParam]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-dropdown]')) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) { showToast('Producto agotado.', 'warning'); return; }
    if (!session) { setShowLoginModal(true); return; }
    const result = cart.addItem({
      productId: product.id, name: product.name, price: product.price,
      imageUrl: product.imageUrl, maxStock: product.stock, category: product.category, sku: product.sku,
    });
    if (result === 'max') showToast('Cantidad maxima en carrito.', 'warning');
    else { setCartToast(product.name); setTimeout(() => setCartToast(null), 3000); }
  };

  const toggleFavorite = (product: Product) => {
    if (!session) { setShowLoginModal(true); return; }
    if (favorites.isFavorite(product.id)) {
      favorites.removeFavorite(product.id);
      showToast('Eliminado de favoritos.', 'success');
    } else {
      favorites.addFavorite({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category });
      showToast('Agregado a favoritos.', 'success');
    }
  };

  const formatCurrency = (val: number) => {
    const symbol = typeof window !== 'undefined' ? (localStorage.getItem('qrshop-currency') || 'Q') : 'Q';
    return `${symbol}${val.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || '#64748b';

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages, cp = pagination.page;
    if (tp <= 5) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else { pages.push(1); if (cp > 3) pages.push('...'); for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i); if (cp < tp - 2) pages.push('...'); pages.push(tp); }
    return pages;
  };

  const totalItems = cart.getTotalItems();
  const subtotal = cart.getSubtotal();
  const shipping = cart.getShipping();
  const total = cart.getTotal();

  const navigateTo = (path: string) => { router.push(path); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-area">
        {/* Header */}
        <header style={{ height: '64px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'none' }} className="hamburger-btn">
            <Menu size={22} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => navigateTo('/forum')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <MessageSquare size={18} /> Foro
            </button>
            <button onClick={() => cart.setOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <ShoppingCart size={18} /> Carrito
              {totalItems > 0 && <span style={{ position: 'absolute', top: '4px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{totalItems}</span>}
            </button>
            {session ? (
              <div data-profile-dropdown style={{ position: 'relative' }}>
                <button onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>Cliente</p>
                  </div>
                  <ChevronDown size={14} style={{ color: 'var(--text-light)', transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
                {profileOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '200px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px', zIndex: 200 }}>
                    <button onClick={() => { navigateTo('/profile'); setProfileOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Settings size={16} style={{ color: 'var(--text-secondary)' }} /> Ajustes
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                    <button onClick={() => signOut({ callbackUrl: '/store' })} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--danger)', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <LogOut size={16} /> Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => signIn()} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> Iniciar sesion
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {/* INICIO VIEW */}
          {viewParam === 'inicio' && (
            <div>
              {/* HERO */}
              <div style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)', borderRadius: '16px', padding: '48px', marginBottom: '32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }} className="home-hero">
                <div style={{ flex: '1 1 400px', zIndex: 1 }}>
                  <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', lineHeight: 1.2 }}>Bienvenido a QRShop</h1>
                  <p style={{ fontSize: '15px', opacity: 0.9, marginBottom: '24px', maxWidth: '480px', lineHeight: 1.6 }}>Descubre productos de calidad en diferentes categorias. Compra facil, rapido y seguro.</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigateTo('/store?view=products')} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', color: '#0891b2', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <ShoppingBag size={18} /> Ver productos
                    </button>
                    <button onClick={() => { const el = document.getElementById('home-categories'); el?.scrollIntoView({ behavior: 'smooth' }); }} style={{ padding: '12px 24px', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'transparent', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <FolderOpen size={18} /> Ver categorias
                    </button>
                  </div>
                </div>
                <div style={{ flex: '0 0 280px', display: 'flex', justifyContent: 'center', zIndex: 1 }} className="hero-qr-wrap">
                  <div style={{ width: '200px', height: '200px', backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 120 120" width="160" height="160">
                      <rect x="10" y="10" width="30" height="30" rx="4" fill="#0891b2"/>
                      <rect x="15" y="15" width="20" height="20" rx="2" fill="#fff"/>
                      <rect x="20" y="20" width="10" height="10" rx="1" fill="#0891b2"/>
                      <rect x="80" y="10" width="30" height="30" rx="4" fill="#0891b2"/>
                      <rect x="85" y="15" width="20" height="20" rx="2" fill="#fff"/>
                      <rect x="90" y="20" width="10" height="10" rx="1" fill="#0891b2"/>
                      <rect x="10" y="80" width="30" height="30" rx="4" fill="#0891b2"/>
                      <rect x="15" y="85" width="20" height="20" rx="2" fill="#fff"/>
                      <rect x="20" y="90" width="10" height="10" rx="1" fill="#0891b2"/>
                      <rect x="50" y="10" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="62" y="10" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="50" y="22" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="50" y="50" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="62" y="50" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="74" y="50" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="86" y="50" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="50" y="62" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="62" y="62" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="50" y="74" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="62" y="86" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="74" y="74" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="86" y="74" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="98" y="62" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="86" y="98" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="98" y="86" width="8" height="8" rx="1" fill="#0891b2"/>
                      <rect x="98" y="98" width="8" height="8" rx="1" fill="#0891b2"/>
                    </svg>
                  </div>
                </div>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', bottom: '-60px', right: '100px', width: '160px', height: '160px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)' }} />
              </div>

              {/* CATEGORIES */}
              <div id="home-categories" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderOpen size={22} style={{ color: 'var(--accent)' }} /> Categorias destacadas
                  </h2>
                  <button onClick={() => navigateTo('/categories')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Ver todas <ArrowRight size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }} className="home-categories-grid">
                  {categories.slice(0, 6).map(cat => {
                    const catIcons: Record<string, any> = { 'Electronicos': Laptop, 'Accesorios': Watch, 'Hogar': Armchair, 'Deportes': Dumbbell, 'Belleza': Palette, 'Juguetes': Baby, 'Bebidas': Coffee, 'Papeleria': Pen, 'Otros': Box };
                    const Icon = catIcons[cat.name] || Tag;
                    const catColors: Record<string, string> = { 'Electronicos': '#3B82F6', 'Accesorios': '#F59E0B', 'Hogar': '#EF4444', 'Deportes': '#10B981', 'Belleza': '#EC4899', 'Juguetes': '#8B5CF6' };
                    const color = catColors[cat.name] || 'var(--accent)';
                    return (
                      <div key={cat.name} onClick={() => navigateTo(`/store?view=products&category=${encodeURIComponent(cat.name)}`)}
                        style={{ padding: '20px 12px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}20`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <Icon size={24} style={{ color }} />
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{cat.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-light)' }}>{cat.count} productos</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SHIPPING BANNER */}
              <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: '14px', padding: '24px 32px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={24} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#065f46', marginBottom: '2px' }}>Envios rapidos a todo el pais</h3>
                    <p style={{ fontSize: '13px', color: '#047857' }}>Recibe tus productos en la puerta de tu casa.</p>
                  </div>
                </div>
                <button onClick={() => navigateTo('/store?view=products')} style={{ background: 'none', border: '1px solid #059669', color: '#059669', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#059669'; }}>
                  Mas informacion <ArrowRight size={14} />
                </button>
              </div>

              {/* FEATURED PRODUCTS */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={22} style={{ color: '#F59E0B', fill: '#F59E0B' }} /> Productos destacados
                  </h2>
                  <button onClick={() => navigateTo('/store?view=products')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Ver todos los productos <ArrowRight size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }} className="home-products-grid">
                  {products.slice(0, 5).map(product => {
                    const avgRating = 3.5 + (product.stock % 3) * 0.5;
                    const fullStars = Math.floor(avgRating);
                    const hasHalf = avgRating % 1 >= 0.5;
                    return (
                      <div key={product.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ height: '160px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={40} style={{ color: 'var(--text-light)' }} />}
                        </div>
                        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', lineHeight: 1.3, flex: 1 }}>{product.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={13} style={{ color: i <= fullStars ? '#F59E0B' : (i === fullStars + 1 && hasHalf ? '#F59E0B' : '#D1D5DB'), fill: i <= fullStars ? '#F59E0B' : (i === fullStars + 1 && hasHalf ? '#F59E0B' : 'none') }} />
                            ))}
                            <span style={{ fontSize: '11px', color: 'var(--text-light)', marginLeft: '4px' }}>({avgRating.toFixed(1)})</span>
                          </div>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>Q{product.price.toFixed(2)}</p>
                          <button onClick={() => navigateTo(`/store?view=products`)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: 'transparent', color: 'var(--accent)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}>
                            Ver mas
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BENEFITS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }} className="home-benefits-grid">
                {[
                  { icon: ShieldCheck, title: 'Compra segura', desc: 'Tu compra esta protegida', color: '#3B82F6' },
                  { icon: BadgeCheck, title: 'Productos verificados', desc: 'Calidad garantizada en cada producto', color: '#10B981' },
                  { icon: CreditCard, title: 'Pagos seguros', desc: 'Multiples metodos de pago', color: '#F59E0B' },
                ].map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} style={{ padding: '24px 16px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', textAlign: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: `${b.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Icon size={24} style={{ color: b.color }} />
                      </div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{b.title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{b.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRODUCTS VIEW */}
          {viewParam === 'products' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShoppingBag size={26} style={{ color: 'var(--accent)' }} /> Nuestros productos
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Descubre productos de calidad en diferentes categorias.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '0 0 300px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input type="text" placeholder="Buscar productos..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '50px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px', flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
                  <button onClick={() => { setSelectedCategory(''); setPage(1); }}
                    style={{ padding: '8px 18px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
                      backgroundColor: selectedCategory === '' ? 'var(--accent)' : 'var(--bg-secondary)', color: selectedCategory === '' ? '#fff' : 'var(--text-secondary)' }}>
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
                      style={{ padding: '8px 18px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s',
                        backgroundColor: selectedCategory === cat.name ? 'var(--accent)' : 'var(--bg-secondary)', color: selectedCategory === cat.name ? '#fff' : 'var(--text-secondary)' }}>
                      {cat.name}
                    </button>
                  ))}
                </div>
                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
                  <option value="popular">Mas populares</option>
                  <option value="price_asc">Menor precio</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="newest">Mas recientes</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }} className="products-layout">
                <div>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Categorias</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => { setSelectedCategory(''); setPage(1); }}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left',
                          backgroundColor: selectedCategory === '' ? 'var(--accent-light)' : 'transparent', color: selectedCategory === '' ? 'var(--accent)' : 'var(--text-primary)', fontWeight: selectedCategory === '' ? 600 : 400 }}>
                        <span>Todos</span><span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{filters.totalProducts}</span>
                      </button>
                      {categories.map(cat => (
                        <button key={cat.name} onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
                          style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left',
                            backgroundColor: selectedCategory === cat.name ? 'var(--accent-light)' : 'transparent', color: selectedCategory === cat.name ? 'var(--accent)' : 'var(--text-primary)', fontWeight: selectedCategory === cat.name ? 600 : 400 }}>
                          <span>{cat.name}</span><span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{cat.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Precio</h3>
                    <input type="range" min="0" max="500" step="5" value={maxPrice} onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1); }} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Q0.00</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Q{maxPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} style={{ color: 'var(--accent)' }} />
                      {selectedCategory || 'Todos'} ({pagination.total} productos)
                    </h2>
                  </div>
                  {loading ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                  ) : products.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <Package size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px', display: 'block' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No se encontraron productos</h3>
                      <p style={{ color: 'var(--text-secondary)' }}>Intenta con otros filtros.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="product-grid-inner">
                        {products.map(product => (
                          <div key={product.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div style={{ position: 'relative', height: '160px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={36} style={{ color: 'var(--text-light)' }} />}
                              <span style={{ position: 'absolute', top: '10px', left: '10px', padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, backgroundColor: getCategoryColor(product.category), color: '#fff' }}>{product.category}</span>
                              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }} style={{ position: 'absolute', top: '10px', right: '10px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorites.isFavorite(product.id) ? '#ef4444' : 'var(--text-light)' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = favorites.isFavorite(product.id) ? '#ef4444' : 'var(--text-light)'}>
                                <Heart size={14} fill={favorites.isFavorite(product.id) ? '#ef4444' : 'none'} />
                              </button>
                            </div>
                            <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{product.name}</h3>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                              <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>{formatCurrency(product.price)}</p>
                              <p style={{ fontSize: '12px', color: product.stock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500, marginBottom: '10px' }}>
                                {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                              </p>
                              <button onClick={() => handleAddToCart(product)} disabled={product.stock <= 0}
                                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', cursor: product.stock > 0 ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  backgroundColor: product.stock > 0 ? 'var(--accent)' : 'var(--border)', color: product.stock > 0 ? '#fff' : 'var(--text-light)' }}>
                                <ShoppingCart size={14} /> {product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '24px', gap: '4px' }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
                          style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasPrev ? 'pointer' : 'default', opacity: pagination.hasPrev ? 1 : 0.4 }}>
                          <ChevronLeft size={16} />
                        </button>
                        {getPageNumbers().map((p, i) => typeof p === 'number' ? (
                          <button key={i} onClick={() => setPage(p)}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: p === pagination.page ? 'var(--accent)' : 'var(--bg-secondary)', color: p === pagination.page ? '#fff' : 'var(--text-secondary)', fontWeight: p === pagination.page ? 700 : 500, fontSize: '13px', cursor: 'pointer' }}>{p}</button>
                        ) : <span key={i} style={{ padding: '0 4px', color: 'var(--text-light)', fontSize: '13px' }}>...</span>)}
                        <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext}
                          style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pagination.hasNext ? 'pointer' : 'default', opacity: pagination.hasNext ? 1 : 0.4 }}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Overlay */}
      {cart.isOpen && <div onClick={() => cart.setOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }} />}

      {/* Cart Sidebar */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', maxWidth: '100vw', height: '100vh', backgroundColor: 'var(--bg-secondary)', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 201, transform: cart.isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent)' }} /> Mi carrito ({totalItems})
          </h2>
          <button onClick={() => cart.setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShoppingCart size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Tu carrito esta vacio</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Agrega productos para comenzar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.items.map(item => (
                <div key={item.productId} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--text-light)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</p>
                        <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{formatCurrency(item.price)}</p>
                      </div>
                      <button onClick={() => cart.removeItem(item.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}><X size={14} /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>-</button>
                      <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: item.quantity >= item.maxStock ? 'default' : 'pointer', opacity: item.quantity >= item.maxStock ? 0.5 : 1, fontSize: '14px' }}>+</button>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: 'auto' }}>x {formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.items.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span><span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Envio:</span>
              <span style={{ fontWeight: 500, color: shipping === 0 ? 'var(--success)' : 'var(--text-primary)' }}>{shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '16px', fontWeight: 700 }}>
              <span>Total:</span><span style={{ color: 'var(--accent)' }}>{formatCurrency(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={() => cart.setOpen(false)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Seguir comprando</button>
              <button onClick={() => { cart.setOpen(false); if (!session) { setShowLoginModal(true); return; } router.push('/checkout'); }} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
                <ShoppingBag size={15} /> Finalizar compra
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cart Toast */}
      {cartToast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--success)', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 300, animation: 'slideUp 0.3s ease' }}>
          <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Producto agregado</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cartToast} se agrego a tu carrito</p>
          </div>
          <button onClick={() => { setCartToast(null); cart.setOpen(true); }} style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Ver carrito</button>
          <button onClick={() => setCartToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}><X size={14} /></button>
        </div>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        .hamburger-btn { display: none !important; }
        @media (max-width: 1280px) { .product-grid-inner { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 1024px) {
          .main-area { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
          .product-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .product-grid-inner { grid-template-columns: repeat(2, 1fr) !important; }
          .products-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) { .product-grid { grid-template-columns: 1fr !important; } .product-grid-inner { grid-template-columns: 1fr !important; } }
        input[type="range"] { -webkit-appearance: none; height: 4px; background: var(--border); border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      </div>
    }>
      <StorePageInner />
    </Suspense>
  );
}
