'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Calendar, ChevronLeft, ChevronRight, Download, RefreshCw, Eye,
  FileText, FileSpreadsheet, DollarSign, Package, ShoppingCart,
  CheckCircle, Search, X, Printer, BarChart3, Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface SaleItem {
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  image?: string;
}

interface Sale {
  id: string;
  folio: string;
  date: string;
  time: string;
  createdAt: string;
  sellerName: string;
  clientName: string;
  clientPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
}

function HistorialContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    totalProducts: 0
  });

  const quickFilters = [
    { label: 'Hoy', value: 'today' },
    { label: 'Ayer', value: 'yesterday' },
    { label: 'Ultimos 7 dias', value: '7days' },
    { label: 'Ultimos 30 dias', value: '30days' },
    { label: 'Este mes', value: 'month' }
  ];

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const today = new Date();
    const todayStr = formatDate(today);
    setStartDate(todayStr);
    setEndDate(todayStr);
    fetchSales(todayStr, todayStr);
  }, []);

  const fetchSales = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?start=${start}&end=${end}`);
      const data = await res.json();
      const salesList = Array.isArray(data) ? data : (data.sales || []);
      setSales(salesList);
      setFilteredSales(salesList);
      calculateMetrics(salesList);
    } catch {
      setSales([]);
      setFilteredSales([]);
      calculateMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data: Sale[]) => {
    if (data.length === 0) {
      setMetrics({ totalSales: 0, totalRevenue: 0, averageTicket: 0, totalProducts: 0 });
      return;
    }
    const totalRevenue = data.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalProducts = data.reduce((sum, s) =>
      sum + (s.items ? s.items.reduce((a: number, i: any) => a + (i.quantity || 0), 0) : 0), 0
    );
    setMetrics({
      totalSales: data.length,
      totalRevenue,
      averageTicket: totalRevenue / data.length,
      totalProducts
    });
  };

  const applyQuickFilter = (value: string) => {
    const today = new Date();
    let start = new Date(today);
    const end = new Date(today);

    switch (value) {
      case 'today': break;
      case 'yesterday': start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); break;
      case '7days': start.setDate(today.getDate() - 6); break;
      case '30days': start.setDate(today.getDate() - 29); break;
      case 'month': start = new Date(today.getFullYear(), today.getMonth(), 1); break;
    }
    const s = formatDate(start);
    const e = formatDate(end);
    setStartDate(s);
    setEndDate(e);
    fetchSales(s, e);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    if (!term.trim()) {
      setFilteredSales(sales);
      return;
    }
    const lower = term.toLowerCase();
    setFilteredSales(sales.filter(s =>
      s.folio?.toLowerCase().includes(lower) ||
      s.clientName?.toLowerCase().includes(lower) ||
      s.sellerName?.toLowerCase().includes(lower)
    ));
  };

  const navigateDate = (dir: 'prev' | 'next') => {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000);
    const delta = dir === 'prev' ? -(diff + 1) : (diff + 1);
    s.setDate(s.getDate() + delta);
    e.setDate(e.getDate() + delta);
    const ns = formatDate(s);
    const ne = formatDate(e);
    setStartDate(ns);
    setEndDate(ne);
    fetchSales(ns, ne);
  };

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const el = document.getElementById('report-printable');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff', logging: false } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const w = 277;
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, w, h);
      pdf.save(`reporte-ventas-${startDate}-${endDate}.pdf`);
      showToast('PDF descargado', 'success');
    } catch {
      showToast('Error al generar PDF', 'error');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const rows = filteredSales.map(s => ({
        'Folio': s.folio,
        'Fecha': `${s.date} ${s.time}`,
        'Cliente': s.clientName,
        'Vendedor': s.sellerName,
        'Productos': s.items?.length || 0,
        'Subtotal': s.subtotal,
        'Descuento': s.discount,
        'Total': s.total,
        'Estado': 'Completada'
      }));
      rows.push({
        'Folio': 'TOTAL', 'Fecha': '', 'Cliente': '', 'Vendedor': '',
        'Productos': filteredSales.reduce((a, s) => a + (s.items?.length || 0), 0),
        'Subtotal': filteredSales.reduce((a, s) => a + s.subtotal, 0),
        'Descuento': filteredSales.reduce((a, s) => a + s.discount, 0),
        'Total': filteredSales.reduce((a, s) => a + s.total, 0),
        'Estado': ''
      } as any);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      XLSX.writeFile(wb, `reporte-ventas-${startDate}-${endDate}.xlsx`);
      showToast('Excel descargado', 'success');
    } catch {
      showToast('Error al generar Excel', 'error');
    }
  };

  const formatCurrency = (v: number) => `$${(v || 0).toFixed(2)}`;
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      {/* Hidden report template for PDF */}
      <div id="report-printable" style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', padding: '32px', background: '#fff' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #374151', paddingBottom: '16px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Variedades Coatan</h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Reporte de Ventas | {startDate} al {endDate}</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Folio</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Fecha</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Cliente</th>
              <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #e5e7eb' }}>Productos</th>
              <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s, i) => (
              <tr key={i}>
                <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>{s.folio}</td>
                <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>{s.date} {s.time}</td>
                <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>{s.clientName}</td>
                <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{s.items?.length || 0}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb', fontWeight: 600 }}>{formatCurrency(s.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, borderTop: '2px solid #374151' }}>
              <td colSpan={3} style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>TOTAL</td>
              <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{metrics.totalProducts}</td>
              <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb', color: '#0891b2' }}>{formatCurrency(metrics.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Historial de Ventas</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Consulta y administra todas las ventas realizadas.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #16a34a', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <FileSpreadsheet size={15} /> Exportar Excel
          </button>
          <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #dc2626', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <FileText size={15} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Rango de Fechas</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>-{'>'}</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Rapido:</span>
            {quickFilters.map(f => (
              <button key={f.value} onClick={() => applyQuickFilter(f.value)} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>{f.label}</button>
            ))}
          </div>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" value={searchTerm} onChange={e => handleSearch(e.target.value)} placeholder="Buscar por folio, cliente o producto..." style={{ padding: '6px 10px 6px 32px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '260px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Ventas', value: metrics.totalSales, sub: 'Ventas realizadas', icon: <ShoppingCart size={22} />, color: '#eff6ff', iconColor: '#2563eb' },
          { label: 'Total Ventas', value: formatCurrency(metrics.totalRevenue), sub: 'Ingresos totales', icon: <DollarSign size={22} />, color: '#f0fdf4', iconColor: '#16a34a' },
          { label: 'Ticket Promedio', value: formatCurrency(metrics.averageTicket), sub: 'Promedio por venta', icon: <BarChart3 size={22} />, color: '#eff6ff', iconColor: '#2563eb' },
          { label: 'Productos Vendidos', value: metrics.totalProducts, sub: 'Total de productos', icon: <Package size={22} />, color: '#fff7ed', iconColor: '#ea580c' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{m.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.sub}</p>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.iconColor }}>{m.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedSale ? '1fr 360px' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Ventas del {formatDisplayDate(startDate)}</h3>
          </div>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Cargando ventas...</p>
            </div>
          ) : paginatedSales.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>No hay ventas para esta fecha</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Folio</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fecha / Hora</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Productos</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((sale) => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{sale.folio}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{sale.date} {sale.time}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)' }}>{sale.clientName || 'Cliente General'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>{sale.items?.length || 0} prod.</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textAlign: 'right' }}>{formatCurrency(sale.total)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>
                            <CheckCircle size={14} /> Completada
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); setSelectedSale(sale); }} style={{ padding: '6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredSales.length)} de {filteredSales.length} ventas</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={14} /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: page === currentPage ? '1px solid var(--accent)' : '1px solid var(--border)', background: page === currentPage ? 'var(--accent)' : 'var(--bg-secondary)', color: page === currentPage ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={14} /></button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSale && (
          <div className="card" style={{ padding: '20px', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Detalle de la Venta</h3>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Folio</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSale.folio}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fecha</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedSale.date} {selectedSale.time}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cliente</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedSale.clientName || 'Cliente General'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Estado</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={13} /> Completada</p>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>Productos</h4>
            <div style={{ marginBottom: '16px' }}>
              {selectedSale.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={14} style={{ color: 'var(--text-secondary)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.quantity} x {formatCurrency(item.price)}</p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Descuento</span>
                <span style={{ color: '#16a34a' }}>{formatCurrency(selectedSale.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                const params = new URLSearchParams({
                  saleId: selectedSale.id,
                  folio: selectedSale.folio,
                  items: encodeURIComponent(JSON.stringify(selectedSale.items)),
                  subtotal: selectedSale.subtotal.toFixed(2),
                  discount: selectedSale.discount.toFixed(2),
                  total: selectedSale.total.toFixed(2),
                  customer: selectedSale.clientName || 'Cliente General',
                  seller: selectedSale.sellerName,
                  date: selectedSale.date,
                  time: selectedSale.time
                });
                router.push(`/sales/confirmation?${params.toString()}`);
              }}
              style={{ width: '100%', marginTop: '16px', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Printer size={15} /> Ver / Imprimir Recibo
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .metrics-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .metrics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function HistorialVentasPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <HistorialContent />
    </Suspense>
  );
}
