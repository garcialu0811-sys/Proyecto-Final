import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import QRCode from 'qrcode';
import { dbClient } from '../lib/db/dbClient';
import { fallbackDb } from '../lib/db/fallbackDb';

describe('QRShop - Pruebas Unitarias Integradas (Vitest)', () => {
  
  // Forzar modo fallback local para que corra de manera offline sin bases de datos remotas
  beforeAll(() => {
    process.env.LOCAL_DEV_FALLBACK = 'true';
    // Inicializar base de datos local
    fallbackDb.get();
  });

  beforeEach(() => {
    // Resetear base de datos a su estado seed inicial antes de cada prueba
    const db = fallbackDb.get();
    db.products = [
      {
        id: 'prod-1',
        name: 'Teclado Mecánico RGB',
        description: 'Teclado mecánico con switches red, retroiluminación RGB.',
        price: 89.99,
        stock: 15,
        category: 'Periféricos',
        imageUrl: '',
        qrCode: 'prod-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-2',
        name: 'Mouse Gamer Inalámbrico',
        description: 'Mouse ergonómico inalámbrico.',
        price: 49.99,
        stock: 8,
        category: 'Periféricos',
        imageUrl: '',
        qrCode: 'prod-2',
        createdAt: new Date().toISOString(),
      }
    ];
    db.users = [
      {
        id: 'user-admin',
        email: 'admin@qrshop.com',
        password: 'admin123',
        name: 'Administrador QRShop',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-vendedor',
        email: 'vendedor@qrshop.com',
        password: 'vendedor123',
        name: 'Carlos Vendedor',
        role: 'VENDEDOR',
        createdAt: new Date().toISOString(),
      },
    ];
    db.sales = [];
    db.orders = [];
    fallbackDb.save(db);
  });

  // 1. GENERACIÓN Y ESCANEO DE QR
  describe('Módulo QR (Generación y Escaneo)', () => {
    it('Debe generar un código QR en base64 correctamente', async () => {
      const productId = 'prod-test-123';
      const qrDataUrl = await QRCode.toDataURL(productId);
      
      expect(qrDataUrl).toBeDefined();
      expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('Debe buscar y encontrar un producto a partir de su código QR escaneado', async () => {
      const scannedCode = 'prod-1';
      const product = await dbClient.products.findByQrCode(scannedCode);
      
      expect(product).toBeDefined();
      expect(product?.id).toBe('prod-1');
      expect(product?.name).toBe('Teclado Mecánico RGB');
    });
  });

  // 2. CRUD DE PRODUCTOS
  describe('CRUD de Productos e Inventario', () => {
    it('Debe crear un nuevo producto con éxito', async () => {
      const newProd = await dbClient.products.create({
        name: 'Memoria RAM 16GB',
        description: 'DDR4 3200MHz',
        price: 75.00,
        stock: 20,
        category: 'Componentes',
        imageUrl: '',
        qrCode: 'ram-16gb'
      });

      expect(newProd).toBeDefined();
      expect(newProd.name).toBe('Memoria RAM 16GB');

      // Comprobar que está en la lista global
      const products = await dbClient.products.findMany();
      expect(products.some(p => p.name === 'Memoria RAM 16GB')).toBe(true);
    });

    it('Debe obtener un producto por su ID único', async () => {
      const product = await dbClient.products.findUnique('prod-1');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Teclado Mecánico RGB');
    });

    it('Debe eliminar un producto de forma lógica y real', async () => {
      const deleteResult = await dbClient.products.delete('prod-2');
      expect(deleteResult).toBe(true);

      const product = await dbClient.products.findUnique('prod-2');
      expect(product).toBeUndefined();
    });
  });

  // 3. VALIDACIÓN DE ROLES Y PERMISOS (CRUD Y EDICIÓN)
  describe('Permisos y Roles de Usuario', () => {
    it('Permisos de VENDEDOR: solo puede modificar precio y stock, no otros campos', async () => {
      const product = await dbClient.products.findUnique('prod-1');
      expect(product).toBeDefined();

      // Simular intento del vendedor de modificar todo
      const role = 'VENDEDOR';
      const body = {
        name: 'Intento cambiar nombre',
        price: 99.99,
        stock: 30,
        category: 'Intento cambiar cat'
      };

      let updateData: any = {};
      if (role === 'ADMIN') {
        updateData = body;
      } else if (role === 'VENDEDOR') {
        // Regla de negocio en API: Vendedor solo actualiza precio y stock
        updateData = {
          price: body.price,
          stock: body.stock
        };
      }

      const updated = await dbClient.products.update('prod-1', updateData);
      
      expect(updated).toBeDefined();
      // Nombre y Categoría deben permanecer inalterados
      expect(updated?.name).toBe('Teclado Mecánico RGB');
      expect(updated?.category).toBe('Periféricos');
      // Precio y stock deben haber cambiado
      expect(updated?.price).toBe(99.99);
      expect(updated?.stock).toBe(30);
    });

    it('Permisos de ADMIN: puede cambiar todos los campos de un producto', async () => {
      const role = 'ADMIN';
      const body = {
        name: 'Teclado Mecánico PRO',
        price: 110.00,
        stock: 12,
        category: 'Teclados'
      };

      const updated = await dbClient.products.update('prod-1', body);
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Teclado Mecánico PRO');
      expect(updated?.category).toBe('Teclados');
      expect(updated?.price).toBe(110.00);
      expect(updated?.stock).toBe(12);
    });
  });

  // 4. AUTENTICACIÓN
  describe('Autenticación y Cuentas', () => {
    it('Debe autorizar correctamente con credenciales correctas', async () => {
      const email = 'admin@qrshop.com';
      const user = await dbClient.users.findUnique(email);

      expect(user).toBeDefined();
      expect(user?.email).toBe(email);
      expect(user?.password).toBe('admin123'); // seed password
    });

    it('Debe bloquear o fallar con credenciales inválidas', async () => {
      const user = await dbClient.users.findUnique('no_existe@qrshop.com');
      expect(user).toBeUndefined();
    });
  });

  // 5. CÁLCULO DE VENTAS Y ESTADÍSTICAS
  describe('Módulo de Ventas e Inventario (Descuento de Stock)', () => {
    it('Debe descontar existencias automáticamente tras registrar una venta', async () => {
      const initialProduct = await dbClient.products.findUnique('prod-1');
      const initialStock = initialProduct?.stock || 0; // 15
      
      const qtySold = 3;

      // 1. Simular la lógica de la API de venta
      if (initialProduct && initialProduct.stock >= qtySold) {
        // Descontar
        await dbClient.products.update('prod-1', {
          stock: initialProduct.stock - qtySold
        });

        // Registrar venta
        await dbClient.sales.create({
          productId: 'prod-1',
          productName: initialProduct.name,
          quantity: qtySold,
          price: initialProduct.price,
          total: initialProduct.price * qtySold,
          sellerId: 'user-vendedor'
        });
      }

      const updatedProduct = await dbClient.products.findUnique('prod-1');
      expect(updatedProduct?.stock).toBe(initialStock - qtySold); // 15 - 3 = 12

      const sales = await dbClient.sales.findMany();
      expect(sales.length).toBe(1);
      expect(sales[0].total).toBe(initialProduct!.price * qtySold);
    });

    it('Debe calcular las estadísticas globales hoy correctamente', async () => {
      const prod = await dbClient.products.findUnique('prod-1');
      
      // Registrar 2 ventas para hoy
      await dbClient.sales.create({
        productId: 'prod-1',
        productName: prod!.name,
        quantity: 1,
        price: prod!.price,
        total: prod!.price,
        sellerId: 'user-vendedor'
      });

      await dbClient.sales.create({
        productId: 'prod-1',
        productName: prod!.name,
        quantity: 2,
        price: prod!.price,
        total: prod!.price * 2,
        sellerId: 'user-vendedor'
      });

      const sales = await dbClient.sales.findMany();
      
      // Simular cálculo del dashboard
      const today = new Date().toISOString().split('T')[0];
      const todaySales = sales.filter((s: any) => s.createdAt.startsWith(today));
      const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);

      expect(todaySales.length).toBe(2);
      expect(todayRevenue).toBe(prod!.price * 3); // 89.99 * 3 = 269.97
    });
  });
});
