import { NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/dbClient';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { qrCode } = await params;
    
    // Buscar primero por ID directo (ya que el código QR codifica el ID)
    let product = await dbClient.products.findUnique(qrCode);
    
    // Si no se encuentra por ID, buscar por la cadena del código QR directamente
    if (!product) {
      product = await dbClient.products.findByQrCode(qrCode);
    }
    
    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado por código QR.' }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error al buscar producto por QR:', error);
    return NextResponse.json({ message: 'Error interno del servidor al buscar producto.' }, { status: 500 });
  }
}
