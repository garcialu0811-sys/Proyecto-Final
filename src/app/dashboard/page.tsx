'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Calendar,
  AlertCircle,
  DollarSign,
  FileText
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface DashboardStats {
  todaySalesCount: number;
  todayRevenue: number;
  lowStockCount: number;
}

interface RecentSale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
}

interface LowStockAlert {
  id: string;
  name: string;
  stock: number;
}

interface ChartItem {
  name: string;
  ventas: number;
  fecha: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for recent sales
  const [salesFilter, setSalesFilter] = useState('All');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session) {
      const role = (session.user as any).role;
      if (role !== 'ADMIN' && role !== 'VENDEDOR') {
        showToast('Acceso denegado. No tienes permisos para ver el dashboard.', 'error');
        router.push('/');
        return;
      }
      fetchDashboardData();
    }
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setChartData(data.chartData);
        setRecentSales(data.recentSales);
        setLowStockAlerts(data.lowStockAlerts);
      } else {
        showToast(data.message || 'Error al cargar estadísticas.', 'error');
      }
    } catch {
      showToast('Error al conectar con la API de estadísticas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter recent sales
  const filteredSales = recentSales.filter(sale => {
    if (salesFilter === 'All') return true;
    if (salesFilter === 'HighValue') return sale.total >= 100;
    if (salesFilter === 'LowValue') return sale.total < 100;
    return true;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="text-center" style={{ padding: '40px 16px' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando estadísticas del Dashboard...</p>
      </div>
    );
  }

  const role = (session?.user as any)?.role;

  return (
    <div>
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Resumen del Negocio</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {role === 'ADMIN' 
              ? 'Estadísticas globales de ventas y control de inventario de Variedades Coatán.' 
              : 'Tus estadísticas de ventas diarias y entregas asignadas.'}
          </p>
        </div>
        <div className="btn btn-secondary" style={{ display: 'flex', gap: '8px', pointerEvents: 'none' }}>
          <Calendar size={18} />
          <span>Hoy: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="dashboard-grid">
          {/* Card 1: Revenue today */}
          <div className="metric-card">
            <div className="metric-info">
              <h3>Ventas de Hoy</h3>
              <div className="value">Q{stats.todayRevenue.toFixed(2)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                {stats.todaySalesCount} transacciones registradas
              </p>
            </div>
            <div className="metric-icon-box green">
              <DollarSign size={24} />
            </div>
          </div>

          {/* Card 3: Stock bajo */}
          <div className="metric-card">
            <div className="metric-info">
              <h3>Alertas de Inventario</h3>
              <div className="value" style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {stats.lowStockCount}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                Productos con 5 o menos stock
              </p>
            </div>
            <div className="metric-icon-box red">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Chart and Low Stock alerts list */}
      <div className="charts-grid">
        
        {/* Weekly sales graph */}
        <div className="card">
          <h2 className="card-title">
            <span>Rendimiento Semanal (Ventas)</span>
            <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          </h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border)', 
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)'
                  }} 
                />
                <Legend fontSize={12} />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  name="Ventas (Q)" 
                  stroke="var(--accent)" 
                  fillOpacity={1} 
                  fill="url(#colorVentas)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts drawer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="card-title">
            <span>Stock Crítico</span>
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
          </h2>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
            {lowStockAlerts.length === 0 ? (
              <div className="text-center" style={{ padding: '40px 10px', color: 'var(--text-secondary)' }}>
                <Package size={32} style={{ color: 'var(--success)', marginBottom: '8px', margin: '0 auto' }} />
                <p style={{ fontSize: '13px', fontWeight: 500 }}>¡Inventario saludable!</p>
                <p style={{ fontSize: '11px', color: 'var(--text-light)' }}>Todos los productos tienen suficiente stock.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lowStockAlerts.map((prod) => (
                  <li 
                    key={prod.id} 
                    style={{ 
                      padding: '12px', 
                      backgroundColor: 'var(--bg-primary)', 
                      borderRadius: 'var(--radius-sm)', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: '4px solid var(--danger)'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13px' }}>{prod.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)' }}>ID: {prod.id}</p>
                    </div>
                    <span 
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: 'var(--danger-light)', 
                        color: 'var(--danger)', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      {prod.stock} disp.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Recent Sales Table */}
      <div className="card">
        <div className="card-title" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-accent" />
            <span>Ventas Recientes</span>
          </div>

          {/* Filter selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setSalesFilter('All')}
              className={`btn ${salesFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px' }}
            >
              Todas
            </button>
            <button
              onClick={() => setSalesFilter('HighValue')}
              className={`btn ${salesFilter === 'HighValue' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px' }}
            >
              Alto Valor (≥Q100)
            </button>
            <button
              onClick={() => setSalesFilter('LowValue')}
              className={`btn ${salesFilter === 'LowValue' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px' }}
            >
              Bajo Valor (&lt;Q100)
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-clean">
            <thead>
              <tr>
                <th>ID Transacción</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
                <th>Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                    No se registran ventas recientes con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{sale.id}</td>
                    <td style={{ fontWeight: 600 }}>{sale.productName}</td>
                    <td>{sale.quantity}</td>
                    <td>Q{sale.price.toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>Q{sale.total.toFixed(2)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      {new Date(sale.createdAt).toLocaleString('es-ES')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* CSS animation injection */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
