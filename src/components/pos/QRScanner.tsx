'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Scan, AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function QRScanner({ onScanSuccess, onClose, isOpen }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = 'qr-scanner-video';
  const isStartingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current) return;
    isStartingRef.current = true;

    try {
      setError(null);
      setIsScanning(false);

      const container = document.getElementById(containerId);
      if (!container) {
        setError('Contenedor no encontrado');
        isStartingRef.current = false;
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setLastScanned(decodedText);
          setScanCount(c => c + 1);
          onScanSuccess(decodedText);
          if (navigator.vibrate) navigator.vibrate(100);
        },
        () => {} // ignore scan errors
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('QR Scanner error:', err);
      if (err?.toString?.().includes('Permission')) {
        setError('Permiso de camara denegado. Habilita el permiso en la configuracion del navegador.');
      } else if (err?.toString?.().includes('NotAllowedError')) {
        setError('Permiso de camara denegado. Haz click en "Permitir" cuando el navegador lo solicite.');
      } else {
        setError('No se pudo acceder a la camara. Verifica los permisos.');
      }
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [onScanSuccess]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%',
        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Camera size={18} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Escanear QR
              </h3>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                Apunta al codigo del producto
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: 'none',
              background: '#f3f4f6', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#6b7280'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scanner Area */}
        <div style={{ padding: '20px' }}>
          <div style={{
            position: 'relative', borderRadius: '12px', overflow: 'hidden',
            background: '#000', aspectRatio: '1'
          }}>
            <div id={containerId} ref={containerRef} style={{ width: '100%' }} />

            {/* Corner guides */}
            {isScanning && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  width: '220px', height: '220px', position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '30px', height: '30px', borderTop: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6', borderRadius: '4px 0 0 0' }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '30px', height: '30px', borderTop: '3px solid #3b82f6', borderRight: '3px solid #3b82f6', borderRadius: '0 4px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '30px', height: '30px', borderBottom: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6', borderRadius: '0 0 0 4px' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderBottom: '3px solid #3b82f6', borderRight: '3px solid #3b82f6', borderRadius: '0 0 4px 0' }} />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            {error ? (
              <div style={{
                padding: '12px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px',
                justifyContent: 'center'
              }}>
                <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
              </div>
            ) : isScanning ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#22c55e', animation: 'pulse 1.5s infinite'
                }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                  Escaneando...
                </span>
                {scanCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>
                    {scanCount} escaneado{scanCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#eab308', animation: 'pulse 1.5s infinite'
                }} />
                <span style={{ fontSize: '13px', color: '#ca8a04' }}>Iniciando camara...</span>
              </div>
            )}
          </div>

          {/* Last scanned feedback */}
          {lastScanned && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#166534' }}>
                Ultimo: <strong>{lastScanned}</strong>
              </span>
            </div>
          )}

          {/* Instructions */}
          <div style={{
            marginTop: '16px', padding: '14px', background: '#f8fafc',
            borderRadius: '10px', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Zap size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
                  Como escanear
                </p>
                <ol style={{ fontSize: '12px', color: '#64748b', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
                  <li>Apunta la camara al codigo QR del producto</li>
                  <li>Manten el telefono estable y a 15-20cm de distancia</li>
                  <li>El producto se agregara automaticamente al carrito</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Retry / Close buttons */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            {!isScanning && !error && (
              <button
                onClick={() => startScanner()}
                style={{
                  flex: 1, padding: '12px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px'
                }}
              >
                <Scan size={16} />
                Reintentar
              </button>
            )}
            <button
              onClick={() => { stopScanner(); onClose(); }}
              style={{
                flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
                fontWeight: 500, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <X size={16} />
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        #qr-scanner-video video {
          border-radius: 12px;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
