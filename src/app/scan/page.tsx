'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  QrCode, Scan, Camera, X, Package, Receipt, Download, RefreshCw,
  Plus, CheckCircle, AlertCircle, ChevronRight, DollarSign, Tag,
  Calendar, Clock, User, FileText, Search, Edit3, Trash2, Save
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { Html5Qrcode } from 'html5-qrcode';
import { ProductDetail } from '@/components/scan/ProductDetail';
import { ReceiptDetail } from '@/components/scan/ReceiptDetail';
import { AddStockModal } from '@/components/scan/AddStockModal';
import { ChangeProductModal } from '@/components/scan/ChangeProductModal';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  qrCode: string;
  sku?: string;
  isActive?: boolean;
  minStock?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ReceiptData {
  folio: string;
  date: string;
  time: string;
  sellerName: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
}

type ScanMode = 'product' | 'receipt';

export default function ScanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const user = session?.user as any;
  const role = user?.role || 'VENDEDOR';

  const [scanMode, setScanMode] = useState<ScanMode>('product');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [productData, setProductData] = useState<Product | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const [showAddStock, setShowAddStock] = useState(false);
  const [showChangeProduct, setShowChangeProduct] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-scanner-container';
  const isStartingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current) return;
    isStartingRef.current = true;
    setScannerError(null);

    try {
      const container = document.getElementById(containerId);
      if (!container) {
        setScannerError('Contenedor no encontrado');
        isStartingRef.current = false;
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanRef.current.code && now - lastScanRef.current.time < 2000) return;
          lastScanRef.current = { code: decodedText, time: now };
          handleScanResult(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
      setScanStatus('scanning');
    } catch (err: any) {
      if (err?.toString?.().includes('Permission') || err?.toString?.().includes('NotAllowedError')) {
        setScannerError('Permiso de camara denegado. Habilita el permiso en la configuracion del navegador.');
      } else {
        setScannerError('No se pudo acceder a la camara. Verifica los permisos.');
      }
      setScanStatus('error');
    } finally {
      isStartingRef.current = false;
    }
  }, [scanMode]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleScanResult = async (code: string) => {
    setLoadingSearch(true);
    try {
      const isProductQR = code.startsWith('PROD:');
      const isReceiptQR = code.includes('/api/sales/folio/');

      if (scanMode === 'product') {
        if (isReceiptQR) {
          showToast('Este es un codigo de recibo. Cambia a modo "Escanear recibo".', 'error');
          setScanStatus('error');
          setLoadingSearch(false);
          return;
        }
        const productId = isProductQR ? code.replace('PROD:', '') : code;
        const res = await fetch(`/api/products/qr/${productId}`);
        const data = await res.json();
        if (res.ok && data.id) {
          setProductData(data);
          setReceiptData(null);
          setScanStatus('success');
          stopScanner();
          showToast(`Producto encontrado: ${data.name}`, 'success');
        } else {
          showToast('Codigo de producto no registrado', 'error');
          setScanStatus('error');
        }
      } else {
        if (isProductQR) {
          showToast('Este es un codigo de producto. Cambia a modo "Escanear producto".', 'error');
          setScanStatus('error');
          setLoadingSearch(false);
          return;
        }
        const folio = isReceiptQR ? code.split('/api/sales/folio/')[1] : code;
        const res = await fetch(`/api/sales/folio/${folio}`);
        if (res.ok) {
          const data = await res.json();
          setReceiptData(data);
          setProductData(null);
          setScanStatus('success');
          stopScanner();
          showToast(`Recibo ${data.folio} encontrado`, 'success');
        } else {
          showToast('Codigo de recibo no valido', 'error');
          setScanStatus('error');
        }
      }
    } catch {
      showToast('Error al buscar', 'error');
      setScanStatus('error');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleScanAgain = () => {
    setProductData(null);
    setReceiptData(null);
    setScanStatus('idle');
    setScannerError(null);
    stopScanner();
    setTimeout(() => startScanner(), 300);
  };

  const handleDownloadQR = async () => {
    if (!productData) return;
    try {
      const qrValue = `PROD:${productData.id}`;
      const { default: QRCode } = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 300, margin: 2, errorCorrectionLevel: 'H',
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      const link = document.createElement('a');
      link.download = `qr-${productData.sku || productData.id}.png`;
      link.href = dataUrl;
      link.click();
      showToast('QR descargado', 'success');
    } catch {
      showToast('Error al generar QR', 'error');
    }
  };

  const handleAddStock = async (quantity: number, reason: string) => {
    if (!productData) return;
    try {
      const res = await fetch(`/api/products/${productData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: productData.stock + quantity })
      });
      if (res.ok) {
        const updated = await res.json();
        setProductData(updated);
        setShowAddStock(false);
        showToast(`${quantity} unidades agregadas`, 'success');
      } else {
        showToast('Error al actualizar stock', 'error');
      }
    } catch {
      showToast('Error de conexion', 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: isMobile ? '16px' : '24px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
          <div style={{
            width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px',
            borderRadius: '10px', background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <QrCode size={isMobile ? 18 : 20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Escanear QR
            </h1>
            {!isMobile && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Escanea codigos QR de productos o recibos de venta.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '16px' : '24px',
        alignItems: 'start'
      }}>
        {/* LEFT - Scanner */}
        <div className="card" style={{ padding: isMobile ? '16px' : '20px' }}>
          <h2 style={{
            fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
            marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Scan size={16} style={{ color: 'var(--accent)' }} />
            Escanear codigo QR
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Apunta la camara al codigo QR para escanear.
          </p>

          {/* Scanner area */}
          <div style={{
            position: 'relative', borderRadius: '12px', overflow: 'hidden',
            background: '#000', aspectRatio: '1', maxHeight: '350px'
          }}>
            <div id={containerId} style={{ width: '100%' }} />

            {/* Corner guides when scanning */}
            {isScanning && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderTop: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)', borderRadius: '4px 0 0 0' }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderTop: '3px solid var(--accent)', borderRight: '3px solid var(--accent)', borderRadius: '0 4px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderBottom: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)', borderRadius: '0 0 0 4px' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderBottom: '3px solid var(--accent)', borderRight: '3px solid var(--accent)', borderRadius: '0 0 4px 0' }} />
                </div>
              </div>
            )}

            {/* Overlay when not scanning */}
            {!isScanning && scanStatus !== 'scanning' && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <Camera size={48} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  Presiona Iniciar para comenzar
                </p>
              </div>
            )}
          </div>

          {/* Scan mode selector */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={() => { setScanMode('product'); if (isScanning) { stopScanner(); setTimeout(() => startScanner(), 300); } }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: isMobile ? '12px' : '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                border: `2px solid ${scanMode === 'product' ? 'var(--accent)' : 'var(--border)'}`,
                background: scanMode === 'product' ? 'var(--accent-light)' : 'transparent',
                color: scanMode === 'product' ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s', minHeight: isMobile ? '44px' : 'auto'
              }}
            >
              <Package size={16} />
              Escanear producto
            </button>
            <button
              onClick={() => { setScanMode('receipt'); if (isScanning) { stopScanner(); setTimeout(() => startScanner(), 300); } }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: isMobile ? '12px' : '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                border: `2px solid ${scanMode === 'receipt' ? 'var(--accent)' : 'var(--border)'}`,
                background: scanMode === 'receipt' ? 'var(--accent-light)' : 'transparent',
                color: scanMode === 'receipt' ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s', minHeight: isMobile ? '44px' : 'auto'
              }}
            >
              <Receipt size={16} />
              Escanear recibo
            </button>
          </div>

          {/* Scanner error */}
          {scannerError && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '8px', display: 'flex',
              alignItems: 'center', gap: '8px', fontSize: '13px', color: '#dc2626'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {scannerError}
            </div>
          )}

          {/* Scan success */}
          {scanStatus === 'success' && (
            <div style={{
              marginTop: '12px', padding: '12px 14px', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>
                <CheckCircle size={16} />
                Escaneo completado
              </div>
              <p style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
                El codigo QR ha sido leido correctamente. Puedes escanear otro producto o recibo.
              </p>
            </div>
          )}

          {/* Scanner controls */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            {!isScanning ? (
              <button
                onClick={startScanner}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: isMobile ? '14px' : '10px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                <Camera size={16} />
                Iniciar escaner
              </button>
            ) : (
              <button
                onClick={handleScanAgain}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: isMobile ? '14px' : '10px', background: 'var(--success)', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                <RefreshCw size={16} />
                Volver a escanear
              </button>
            )}
            {isScanning && (
              <button
                onClick={() => { stopScanner(); setScanStatus('idle'); }}
                style={{
                  padding: isMobile ? '14px 16px' : '10px 16px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px',
                  color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px', minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                <X size={16} />
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* RIGHT - Result */}
        <div>
          {loadingSearch && (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '40px', border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Buscando...</p>
            </div>
          )}

          {!loadingSearch && productData && scanStatus === 'success' && (
            <ProductDetail
              product={productData}
              onDownloadQR={handleDownloadQR}
              onAddStock={() => setShowAddStock(true)}
            />
          )}

          {!loadingSearch && receiptData && scanStatus === 'success' && (
            <ReceiptDetail
              receipt={receiptData}
              onChangeProduct={() => setShowChangeProduct(true)}
            />
          )}

          {!loadingSearch && scanStatus === 'idle' && !productData && !receiptData && (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <QrCode size={56} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Esperando escaneo
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                Escanea un codigo QR de un producto o recibo para ver su informacion aqui.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-light)' }}>
                  <Package size={14} />
                  Producto
                </div>
                <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-light)' }}>
                  <Receipt size={14} />
                  Recibo
                </div>
              </div>
            </div>
          )}

          {!loadingSearch && scanStatus === 'error' && (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--danger)', marginBottom: '8px' }}>
                Error al escanear
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                No se pudo leer el codigo QR. Asegurate de que el codigo sea valido.
              </p>
              <button
                onClick={handleScanAgain}
                style={{
                  padding: '8px 20px', background: 'transparent', border: '1px solid var(--accent)',
                  borderRadius: '8px', color: 'var(--accent)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddStock && productData && (
        <AddStockModal
          product={productData}
          onClose={() => setShowAddStock(false)}
          onConfirm={handleAddStock}
        />
      )}

      {showChangeProduct && receiptData && (
        <ChangeProductModal
          receipt={receiptData}
          onClose={() => setShowChangeProduct(false)}
          onConfirm={() => { setShowChangeProduct(false); showToast('Cambio registrado', 'success'); }}
        />
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #qr-scanner-container video { border-radius: 12px; object-fit: cover; }
      `}</style>
    </div>
  );
}
