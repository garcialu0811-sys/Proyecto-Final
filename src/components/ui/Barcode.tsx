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
        size={180}
        level="M"
        fgColor="#1a2a3a"
        bgColor="#ffffff"
        style={{ width: '100%', maxWidth: '180px', height: 'auto' }}
      />
    </div>
  );
}
