'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle, Printer, FileText, Download, X, MapPin, Phone,
  User, Calendar, Clock, ShoppingBag, Receipt, FileSpreadsheet
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

interface SaleData {
  id: string;
  folio: string;
  date: string;
  time: string;
  sellerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerName?: string;
}

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [saleData, setSaleData] = useState<SaleData | null>(null);

  const storeData = {
    name: 'Variedades Coatan',
    subtitle: 'Abarrotes y Productos del Hogar',
    address: 'Av. Juarez #456, Coatan, Ver.',
    phone: '555-123-4567',
  };

  const generateFolio = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `VTA-${y}${m}${d}-${h}${min}${s}-${rand}`;
  };

  useEffect(() => {
    const saleId = searchParams?.get('saleId');
    const folioParam = searchParams?.get('folio');
    const itemsParam = searchParams?.get('items');
    const totalParam = searchParams?.get('total');
    const subtotalParam = searchParams?.get('subtotal');
    const discountParam = searchParams?.get('discount');
    const customerParam = searchParams?.get('customer');
    const sellerParam = searchParams?.get('seller');
    const dateParam = searchParams?.get('date');
    const timeParam = searchParams?.get('time');

    if (itemsParam) {
      try {
        const items = JSON.parse(decodeURIComponent(itemsParam));
        const now = new Date();
        setSaleData({
          id: saleId || Date.now().toString(),
          folio: folioParam || generateFolio(),
          date: dateParam || now.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: timeParam || now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
          sellerName: sellerParam || 'Administrador QRShop',
          items,
          subtotal: parseFloat(subtotalParam || '0'),
          discount: parseFloat(discountParam || '0'),
          total: parseFloat(totalParam || '0'),
          customerName: customerParam || ''
        });
      } catch {
        loadDemoData();
      }
    } else {
      loadDemoData();
    }
  }, [searchParams]);

  const loadDemoData = () => {
    setSaleData({
      id: 'sale-001',
      folio: 'VTA-00013',
      date: '31/05/2024',
      time: '04:28 PM',
      sellerName: 'Administrador QRShop',
      items: [
        { productName: 'Coca Cola 355ml', sku: '7501055305334', quantity: 2, price: 15.00, subtotal: 30.00 },
        { productName: 'Agua Ciel 600ml', sku: '7501055301251', quantity: 1, price: 10.00, subtotal: 10.00 },
        { productName: 'Sabritas Original 45g', sku: '7500478003998', quantity: 1, price: 12.00, subtotal: 12.00 },
        { productName: 'Pan Bimbo Blanco', sku: '7501000112298', quantity: 1, price: 18.00, subtotal: 18.00 },
        { productName: 'Jugo Del Valle 500ml', sku: '7501030475126', quantity: 1, price: 18.00, subtotal: 18.00 },
      ],
      subtotal: 88.00,
      discount: 0.00,
      total: 88.00,
    });
  };

  const handlePrint = useCallback(() => {
    const el = document.getElementById('receipt-printable');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) {
      showToast('No se pudo abrir la ventana de impresion', 'error');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
      body{font-family:'Courier New',monospace;margin:0;padding:16px;background:#fff;color:#000;font-size:12px;}
      .r{max-width:320px;margin:0 auto;}
      .center{text-align:center;}
      .bold{font-weight:700;}
      .border-top{border-top:1px dashed #000;margin:12px 0;}
      .border-double{border-top:2px double #000;margin:12px 0;}
      table{width:100%;border-collapse:collapse;}
      td{padding:3px 0;}
      .right{text-align:right;}
      .small{font-size:10px;color:#555;}
    </style></head><body><div class="r">${el.innerHTML}</div>
    <script>window.onload=function(){window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
  }, [showToast]);

  const handleDownloadPDF = async () => {
    const el = document.getElementById('receipt-printable');
    if (!el) return;
    setLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
      const imgWidth = 76;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 2, 10, imgWidth, imgHeight);
      pdf.save(`recibo-${saleData?.folio || 'venta'}.pdf`);
      showToast('PDF descargado exitosamente', 'success');
    } catch {
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!saleData) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const data = [
        ['Variedades Coatan - Recibo de Venta'],
        [''],
        ['Folio:', saleData.folio],
        ['Fecha:', saleData.date],
        ['Hora:', saleData.time],
        ['Vendedor:', saleData.sellerName],
        [''],
        ['Producto', 'SKU', 'Cantidad', 'Precio Unit.', 'Subtotal'],
        ...saleData.items.map(i => [i.productName, i.sku, i.quantity, i.price, i.subtotal]),
        [''],
        ['Subtotal', '', '', '', saleData.subtotal],
        ['Descuento', '', '', '', saleData.discount],
        ['TOTAL', '', '', '', saleData.total],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Recibo');
      XLSX.writeFile(wb, `recibo-${saleData.folio}.xlsx`);
      showToast('Excel descargado exitosamente', 'success');
    } catch {
      showToast('Error al generar Excel', 'error');
    }
  };

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  if (!saleData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Success Banner */}
      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center', position: 'relative' }}>
        <button
          onClick={() => router.push('/sales')}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
        >
          <X size={20} />
        </button>
        <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#065f46', marginBottom: '4px' }}>Venta registrada con exito!</h1>
        <p style={{ fontSize: '14px', color: '#047857' }}>Tu venta ha sido guardada correctamente.</p>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Receipt */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div id="receipt-printable" ref={receiptRef} style={{ padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '2px dashed #d1d5db', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '12px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>{storeData.name}</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>{storeData.subtitle}</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <MapPin size={13} /> {storeData.address}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Phone size={13} /> {storeData.phone}
              </p>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>RECIBO DE VENTA</h3>
              <p style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600, margin: 0 }}>Folio: {saleData.folio}</p>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#4b5563' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} style={{ color: '#9ca3af' }} /> Fecha: {saleData.date}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={13} style={{ color: '#9ca3af' }} /> Hora: {saleData.time}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} style={{ color: '#9ca3af' }} /> Vendedor: {saleData.sellerName}
            </div>

            {/* Products Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Producto</th>
                  <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600, color: '#4b5563' }}>Cantidad</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#4b5563' }}>Precio Unit.</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#4b5563' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {saleData.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ShoppingBag size={16} style={{ color: '#9ca3af' }} />
                          )}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, color: '#111827', margin: 0 }}>{item.productName}</p>
                          <p style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', margin: '2px 0 0' }}>{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '16px', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Subtotal:</span>
                <span style={{ color: '#111827' }}>{formatCurrency(saleData.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Descuento:</span>
                <span style={{ color: '#10b981', fontWeight: 500 }}>{formatCurrency(saleData.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px dashed #d1d5db' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>TOTAL:</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(saleData.total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px dashed #d1d5db', marginTop: '20px', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Gracias por tu compra!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>Vuelve pronto</p>
              {/* Barcode placeholder */}
              <div style={{ margin: '0 auto 12px', maxWidth: '200px' }}>
                <svg viewBox="0 0 200 40" style={{ width: '100%', height: '30px' }}>
                  {Array.from({ length: 60 }).map((_, i) => (
                    <rect key={i} x={i * 3.2 + 2} y={0} width={Math.random() > 0.5 ? 2 : 1} height={35} fill="#000" />
                  ))}
                  <text x="100" y="38" textAnchor="middle" fontSize="7" fill="#374151" fontFamily="monospace">{saleData.folio}</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Note */}
          <div style={{ padding: '16px 32px 24px' }}>
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#166534', margin: 0 }}>Nota:</p>
                <p style={{ fontSize: '12px', color: '#15803d', margin: '2px 0 0' }}>Este recibo es valido como comprobante de compra.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Que deseas hacer ahora?</h3>

          {/* Imprimir */}
          <div className="card" style={{ padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Printer size={24} style={{ color: '#2563eb' }} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Imprimir Recibo</h4>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Imprime el recibo de esta venta.</p>
            <button
              onClick={handlePrint}
              style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              Imprimir
            </button>
          </div>

          {/* PDF */}
          <div className="card" style={{ padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <FileText size={24} style={{ color: '#dc2626' }} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Descargar PDF</h4>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Descarga el recibo en formato PDF.</p>
            <button
              onClick={handleDownloadPDF}
              disabled={loading}
              style={{ width: '100%', padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Generando...
                </>
              ) : (
                <>
                  <Download size={15} />
                  Descargar PDF
                </>
              )}
            </button>
          </div>

          {/* Excel */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <FileSpreadsheet size={24} style={{ color: '#16a34a' }} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Descargar Excel</h4>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Descarga los detalles de la venta en Excel.</p>
            <button
              onClick={handleDownloadExcel}
              style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} />
              Descargar Excel
            </button>
          </div>

          {/* Cerrar */}
          <button
            onClick={() => router.push('/sales')}
            style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <X size={16} />
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .confirmation-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function ConfirmacionVentaPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ConfirmacionContent />
    </Suspense>
  );
}
