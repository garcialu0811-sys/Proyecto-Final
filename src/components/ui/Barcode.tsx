'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}

export default function Barcode({ value, width = 2, height = 50, fontSize = 14, style }: BarcodeProps) {
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

  return <svg ref={svgRef} style={style} />;
}
