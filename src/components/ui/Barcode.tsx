'use client';

import { QRCodeSVG } from 'qrcode.react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  style?: React.CSSProperties;
  maxWidth?: string;
}

export default function Barcode({ value, maxWidth = '260px' }: BarcodeProps) {
  if (!value) return null;

  return (
    <div style={{ maxWidth, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      <QRCodeSVG
        value={value}
        size={220}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        style={{ width: '100%', maxWidth: '220px', height: 'auto' }}
      />
    </div>
  );
}
