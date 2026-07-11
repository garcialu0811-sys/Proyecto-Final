'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  style?: React.CSSProperties;
  maxWidth?: string;
}

export default function Barcode({ value, width = 1.5, height = 35, fontSize = 11, style, maxWidth = '100%' }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 8,
          background: '#ffffff',
          lineColor: '#1a2a3a',
        });
      } catch (err) {
        console.error('Barcode error:', err);
      }
    }
  }, [value, width, height, fontSize]);

  if (!value) return null;

  return (
    <div style={{ maxWidth, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <svg ref={svgRef} style={{ ...style, width: '100%', minWidth: 0 }} />
    </div>
  );
}
