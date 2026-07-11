import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { qrCode } = await params;
    
    // Buscar primero por ID directo
    let product = await dbClient.products.findUnique(qrCode);
    
    // Si no se encuentra por ID, buscar por SKU
    if (!product) {
      product = await dbClient.products.findBySku(qrCode);
    }
    
    // Si no se encuentra por SKU, buscar por qrCode
    if (!product) {
      product = await dbClient.products.findByQrCode(qrCode);
    }

    // Si no se encuentra, buscar por nombre exacto
    if (!product) {
      product = await dbClient.products.findByName(qrCode);
    }
    
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error al buscar producto:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
