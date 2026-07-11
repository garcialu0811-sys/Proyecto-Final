import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'local_db.json');

// Types
export interface User {
  id: string;
  email: string;
  password?: string; // stored as plain or hashed, for fallback plain is easy for verification
  name: string;
  role: 'ADMIN' | 'VENDEDOR';
  phone?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  folio: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  sellerId: string;
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  status: 'PENDIENTE' | 'PROCESANDO' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  driverId?: string;
  driverName?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  sku: string;
  isActive: boolean;
  imageUrl: string;
  qrCode: string;
  costPrice: number;
  location: {
    warehouse: string;
    aisle: string;
    shelf: string;
  };
  createdAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: 'SUGERENCIA' | 'DUDA' | 'RESENA' | 'GENERAL';
  authorId: string;
  authorName: string;
  createdAt: string;
  isHidden: boolean;
  likes: string[];
}

export interface ForumReply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId?: string;
  createdAt: string;
  isHidden: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface LocalSchema {
  users: User[];
  sales: Sale[];
  orders: Order[];
  products: Product[];
  movements: Movement[];
  forumPosts: ForumPost[];
  forumReplies: ForumReply[];
  categories: Category[];
}

// Helper to check if fallback is active
export function isFallbackActive(): boolean {
  return process.env.LOCAL_DEV_FALLBACK === 'true';
}

// Initialize database
function initDb(): LocalSchema {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data) as LocalSchema;
    } catch {
      // JSON corrupt, reconstruct
    }
  }

  // Seed default data
  const defaultDb: LocalSchema = {
    users: [
      {
        id: 'user-admin',
        email: 'admin@qrshop.com',
        password: 'admin123', // plaintext for quick development/testing
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
      }
    ],
    sales: [
      {
        id: 'sale-1',
        folio: 'VTA-00001',
        productId: 'prod-1',
        productName: 'Teclado Mecánico RGB',
        quantity: 1,
        price: 89.99,
        total: 89.99,
        sellerId: 'user-vendedor',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      },
      {
        id: 'sale-2',
        folio: 'VTA-00002',
        productId: 'prod-2',
        productName: 'Mouse Gamer Inalámbrico',
        quantity: 2,
        price: 49.99,
        total: 99.98,
        sellerId: 'user-vendedor',
        createdAt: new Date().toISOString(), // Today
      }
    ],
    orders: [
      {
        id: 'ord-1',
        productId: 'prod-1',
        productName: 'Teclado Mecánico RGB',
        quantity: 1,
        price: 89.99,
        total: 89.99,
        status: 'EN_RUTA',
        clientName: 'María Gómez',
        clientPhone: '555-1234',
        clientAddress: 'Av. Reforma 1234, CDMX',
        driverId: 'user-vendedor',
        driverName: 'Carlos Vendedor',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ord-2',
        productId: 'prod-3',
        productName: 'Monitor 27" IPS 144Hz',
        quantity: 1,
        price: 249.99,
        total: 249.99,
        status: 'PENDIENTE',
        clientName: 'Luis Pérez',
        clientPhone: '555-5678',
        clientAddress: 'Calle Juárez 56, Col. Centro',
        createdAt: new Date().toISOString(),
      }
    ],
    products: [
      {
        id: 'prod-1',
        name: 'Cafe Premium',
        description: 'Cafe de alta calidad de origen guatemalteco.',
        price: 75.00,
        stock: 15,
        minStock: 5,
        category: 'Bebidas',
        sku: 'CAF-001',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-1',
        costPrice: 45.00,
        location: { warehouse: 'Almacen Principal', aisle: 'Pasillo A', shelf: 'Estante 1' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-2',
        name: 'Taza Magica',
        description: 'Taza con diseno que cambia de color al calentar.',
        price: 45.00,
        stock: 8,
        minStock: 3,
        category: 'Accesorios',
        sku: 'TAZ-002',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-2',
        costPrice: 25.00,
        location: { warehouse: 'Almacen Principal', aisle: 'Pasillo B', shelf: 'Estante 2' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-3',
        name: 'Auriculares X1',
        description: 'Auriculares inalambricos con cancelacion de ruido.',
        price: 120.00,
        stock: 6,
        minStock: 10,
        category: 'Electrónicos',
        sku: 'AUR-003',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-3',
        costPrice: 70.00,
        location: { warehouse: 'Almacen Principal', aisle: 'Pasillo C', shelf: 'Estante 1' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-4',
        name: 'Botella Termica',
        description: 'Botella termica de acero inoxidable.',
        price: 85.00,
        stock: 10,
        minStock: 5,
        category: 'Accesorios',
        sku: 'BOT-004',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-4',
        costPrice: 50.00,
        location: { warehouse: 'Almacen Secundario', aisle: '', shelf: 'Estante 3' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-5',
        name: 'Cuaderno Premium',
        description: 'Cuaderno de lujo con cubierta de cuero.',
        price: 35.00,
        stock: 20,
        minStock: 10,
        category: 'Papelería',
        sku: 'CUA-005',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-5',
        costPrice: 20.00,
        location: { warehouse: 'Almacen Secundario', aisle: '', shelf: 'Estante 1' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prod-6',
        name: 'Planta Decorativa',
        description: 'Planta artificial de alta calidad, decorativa.',
        price: 60.00,
        stock: 2,
        minStock: 5,
        category: 'Hogar',
        sku: 'PLA-006',
        isActive: true,
        imageUrl: '',
        qrCode: 'prod-6',
        costPrice: 35.00,
        location: { warehouse: 'Almacen Principal', aisle: 'Pasillo D', shelf: 'Estante 2' },
        createdAt: new Date().toISOString(),
      }
    ],
    movements: [
      {
        id: 'mov-1',
        productId: 'prod-3',
        productName: 'Auriculares X1',
        sku: 'AUR-003',
        type: 'OUT',
        quantity: 2,
        previousStock: 8,
        newStock: 6,
        reason: 'Venta',
        reference: 'V-000123',
        userId: 'user-vendedor',
        userName: 'Carlos Vendedor',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mov-2',
        productId: 'prod-1',
        productName: 'Cafe Premium',
        sku: 'CAF-001',
        type: 'IN',
        quantity: 10,
        previousStock: 5,
        newStock: 15,
        reason: 'Compra',
        reference: 'C-000045',
        userId: 'user-admin',
        userName: 'Administrador',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mov-3',
        productId: 'prod-2',
        productName: 'Taza Magica',
        sku: 'TAZ-002',
        type: 'ADJUSTMENT',
        quantity: 1,
        previousStock: 7,
        newStock: 8,
        reason: 'Inventario fisico',
        reference: '',
        userId: 'user-admin',
        userName: 'Administrador',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mov-4',
        productId: 'prod-5',
        productName: 'Cuaderno Premium',
        sku: 'CUA-005',
        type: 'IN',
        quantity: 15,
        previousStock: 5,
        newStock: 20,
        reason: 'Reposicion',
        reference: 'C-000046',
        userId: 'user-admin',
        userName: 'Administrador',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mov-5',
        productId: 'prod-4',
        productName: 'Botella Termica',
        sku: 'BOT-004',
        type: 'OUT',
        quantity: 3,
        previousStock: 13,
        newStock: 10,
        reason: 'Venta',
        reference: 'V-000124',
        userId: 'user-vendedor',
        userName: 'Carlos Vendedor',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ],
    forumPosts: [
      {
        id: 'post-1',
        title: 'Excelente servicio y productos',
        content: 'Acabo de comprar el monitor de 27 pulgadas y es increíble. La tasa de refresco se nota de inmediato. ¿Alguien más lo ha probado?',
        category: 'RESENA',
        authorId: 'user-vendedor',
        authorName: 'Carlos Vendedor',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isHidden: false,
        likes: ['user-vendedor'],
      },
      {
        id: 'post-2',
        title: 'Sugerencia: Agregar teclados ergonómicos',
        content: 'Me gustaría ver teclados ergonómicos en la tienda, del tipo split o con reposamuñecas acolchados. Ayudaría mucho para largas horas de trabajo.',
        category: 'SUGERENCIA',
        authorId: 'user-vendedor',
        authorName: 'Carlos Vendedor',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        isHidden: false,
        likes: [],
      }
    ],
    forumReplies: [
      {
        id: 'rep-1',
        postId: 'post-1',
        content: 'Totalmente de acuerdo! Yo tambien lo compre hace una semana y el panel IPS tiene unos colores hermosos.',
        authorId: 'user-vendedor',
        authorName: 'Carlos Vendedor',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isHidden: false,
      }
    ],
    categories: [
      { id: 'cat-1', name: 'Bebidas', description: 'Todo tipo de bebidas calientes y frias.', icon: 'Coffee', color: '#8B5CF6', isActive: true, createdAt: '2024-05-15T00:00:00.000Z' },
      { id: 'cat-2', name: 'Accesorios', description: 'Accesorios y complementos variados.', icon: 'Watch', color: '#F59E0B', isActive: true, createdAt: '2024-05-18T00:00:00.000Z' },
      { id: 'cat-3', name: 'Electrónicos', description: 'Dispositivos y accesorios electrónicos.', icon: 'Laptop', color: '#3B82F6', isActive: true, createdAt: '2024-05-20T00:00:00.000Z' },
      { id: 'cat-4', name: 'Papelería', description: 'Útiles escolares y de oficina.', icon: 'Pen', color: '#10B981', isActive: true, createdAt: '2024-05-22T00:00:00.000Z' },
      { id: 'cat-5', name: 'Hogar', description: 'Artículos para el hogar y decoración.', icon: 'Home', color: '#EF4444', isActive: true, createdAt: '2024-05-25T00:00:00.000Z' },
      { id: 'cat-6', name: 'Deportes', description: 'Equipamiento y accesorios deportivos.', icon: 'Trophy', color: '#EC4899', isActive: false, createdAt: '2024-05-28T00:00:00.000Z' },
      { id: 'cat-7', name: 'Regalos', description: 'Regalos y detalles especiales.', icon: 'Gift', color: '#F472B6', isActive: true, createdAt: '2024-05-30T00:00:00.000Z' },
      { id: 'cat-8', name: 'Mascotas', description: 'Productos para mascotas.', icon: 'PawPrint', color: '#8B5CF6', isActive: true, createdAt: '2024-06-02T00:00:00.000Z' },
    ],
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
  return defaultDb;
}

export const fallbackDb = {
  get: (): LocalSchema => {
    return initDb();
  },

  save: (data: LocalSchema) => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // On Vercel/serverless, filesystem is read-only - skip saving
    }
  },

  // Users
  users: {
    findMany: (): User[] => {
      return fallbackDb.get().users;
    },
    findUnique: (email: string): User | undefined => {
      return fallbackDb.get().users.find(u => u.email === email);
    },
    findById: (id: string): User | undefined => {
      return fallbackDb.get().users.find(u => u.id === id);
    },
    create: (user: Omit<User, 'id' | 'createdAt'>): User => {
      const db = fallbackDb.get();
      const newUser: User = {
        ...user,
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      fallbackDb.save(db);
      return newUser;
    },
    update: (id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): User | undefined => {
      const db = fallbackDb.get();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return undefined;
      db.users[idx] = { ...db.users[idx], ...data };
      fallbackDb.save(db);
      return db.users[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      const len = db.users.length;
      db.users = db.users.filter(u => u.id !== id);
      fallbackDb.save(db);
      return db.users.length < len;
    }
  },

  // Products
  products: {
    findMany: (): Product[] => {
      return fallbackDb.get().products;
    },
    findUnique: (id: string): Product | undefined => {
      return fallbackDb.get().products.find(p => p.id === id);
    },
    findByQrCode: (qrCode: string): Product | undefined => {
      return fallbackDb.get().products.find(p => p.qrCode === qrCode);
    },
    findBySku: (sku: string): Product | undefined => {
      return fallbackDb.get().products.find(p => p.sku === sku);
    },
    findByName: (name: string): Product | undefined => {
      return fallbackDb.get().products.find(p => p.name === name);
    },
    create: (product: Omit<Product, 'id' | 'createdAt'>): Product => {
      const db = fallbackDb.get();
      const newProduct: Product = {
        ...product,
        minStock: product.minStock ?? 5,
        costPrice: product.costPrice ?? 0,
        location: product.location ?? { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
        id: 'prod-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      db.products.push(newProduct);
      fallbackDb.save(db);
      return newProduct;
    },
    update: (id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>): Product | undefined => {
      const db = fallbackDb.get();
      const idx = db.products.findIndex(p => p.id === id);
      if (idx === -1) return undefined;
      db.products[idx] = { ...db.products[idx], ...data };
      fallbackDb.save(db);
      return db.products[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      const len = db.products.length;
      db.products = db.products.filter(p => p.id !== id);
      fallbackDb.save(db);
      return db.products.length < len;
    }
  },

  // Sales
  sales: {
    findMany: (): Sale[] => {
      return fallbackDb.get().sales;
    },
    create: (sale: Omit<Sale, 'id' | 'createdAt'>): Sale => {
      const db = fallbackDb.get();
      const newSale: Sale = {
        ...sale,
        id: 'sale-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      } as Sale;
      db.sales.push(newSale);
      fallbackDb.save(db);
      return newSale;
    }
  },

  // Orders
  orders: {
    findMany: (): Order[] => {
      return fallbackDb.get().orders;
    },
    findUnique: (id: string): Order | undefined => {
      return fallbackDb.get().orders.find(o => o.id === id);
    },
    create: (order: Omit<Order, 'id' | 'createdAt'>): Order => {
      const db = fallbackDb.get();
      const newOrder: Order = {
        ...order,
        id: 'ord-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      db.orders.push(newOrder);
      fallbackDb.save(db);
      return newOrder;
    },
    update: (id: string, data: Partial<Omit<Order, 'id' | 'createdAt'>>): Order | undefined => {
      const db = fallbackDb.get();
      const idx = db.orders.findIndex(o => o.id === id);
      if (idx === -1) return undefined;
      db.orders[idx] = { ...db.orders[idx], ...data };
      fallbackDb.save(db);
      return db.orders[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      const len = db.orders.length;
      db.orders = db.orders.filter(o => o.id !== id);
      fallbackDb.save(db);
      return db.orders.length < len;
    }
  },

  // Forum Posts
  forumPosts: {
    findMany: (): ForumPost[] => {
      return fallbackDb.get().forumPosts;
    },
    create: (post: Omit<ForumPost, 'id' | 'createdAt' | 'isHidden' | 'likes'>): ForumPost => {
      const db = fallbackDb.get();
      const newPost: ForumPost = {
        ...post,
        id: 'post-' + Math.random().toString(36).substr(2, 9),
        isHidden: false,
        likes: [],
        createdAt: new Date().toISOString(),
      };
      db.forumPosts.push(newPost);
      fallbackDb.save(db);
      return newPost;
    },
    toggleLike: (id: string, userId: string): ForumPost | undefined => {
      const db = fallbackDb.get();
      const idx = db.forumPosts.findIndex(p => p.id === id);
      if (idx === -1) return undefined;
      const likes = db.forumPosts[idx].likes || [];
      const likeIdx = likes.indexOf(userId);
      if (likeIdx >= 0) {
        likes.splice(likeIdx, 1);
      } else {
        likes.push(userId);
      }
      db.forumPosts[idx].likes = likes;
      fallbackDb.save(db);
      return db.forumPosts[idx];
    },
    updateVisibility: (id: string, isHidden: boolean): ForumPost | undefined => {
      const db = fallbackDb.get();
      const idx = db.forumPosts.findIndex(p => p.id === id);
      if (idx === -1) return undefined;
      db.forumPosts[idx].isHidden = isHidden;
      fallbackDb.save(db);
      return db.forumPosts[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      const len = db.forumPosts.length;
      db.forumPosts = db.forumPosts.filter(p => p.id !== id);
      // Also delete associated replies
      db.forumReplies = db.forumReplies.filter(r => r.postId !== id);
      fallbackDb.save(db);
      return db.forumPosts.length < len;
    }
  },

  // Forum Replies
  forumReplies: {
    findMany: (): ForumReply[] => {
      return fallbackDb.get().forumReplies;
    },
    create: (reply: Omit<ForumReply, 'id' | 'createdAt' | 'isHidden'>): ForumReply => {
      const db = fallbackDb.get();
      const newReply: ForumReply = {
        ...reply,
        id: 'rep-' + Math.random().toString(36).substr(2, 9),
        isHidden: false,
        createdAt: new Date().toISOString(),
      };
      db.forumReplies.push(newReply);
      fallbackDb.save(db);
      return newReply;
    },
    updateContent: (id: string, content: string): ForumReply | undefined => {
      const db = fallbackDb.get();
      const idx = db.forumReplies.findIndex(r => r.id === id);
      if (idx === -1) return undefined;
      db.forumReplies[idx].content = content;
      fallbackDb.save(db);
      return db.forumReplies[idx];
    },
    updateVisibility: (id: string, isHidden: boolean): ForumReply | undefined => {
      const db = fallbackDb.get();
      const idx = db.forumReplies.findIndex(r => r.id === id);
      if (idx === -1) return undefined;
      db.forumReplies[idx].isHidden = isHidden;
      fallbackDb.save(db);
      return db.forumReplies[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      const len = db.forumReplies.length;
      db.forumReplies = db.forumReplies.filter(r => r.id !== id);
      fallbackDb.save(db);
      return db.forumReplies.length < len;
    }
  },

  // Movements
  movements: {
    findMany: (limit?: number): Movement[] => {
      const all = fallbackDb.get().movements || [];
      const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return limit ? sorted.slice(0, limit) : sorted;
    },
    findByProduct: (productId: string): Movement[] => {
      return (fallbackDb.get().movements || [])
        .filter(m => m.productId === productId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    create: (movement: Omit<Movement, 'id' | 'createdAt'>): Movement => {
      const db = fallbackDb.get();
      if (!db.movements) db.movements = [];
      const newMovement: Movement = {
        ...movement,
        id: 'mov-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      db.movements.push(newMovement);
      fallbackDb.save(db);
      return newMovement;
    },
    getTodayCount: (): number => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (fallbackDb.get().movements || []).filter(m => new Date(m.createdAt) >= today).length;
    }
  },

  // Categories
  categories: {
    findMany: (): Category[] => {
      return fallbackDb.get().categories || [];
    },
    findUnique: (id: string): Category | undefined => {
      return (fallbackDb.get().categories || []).find(c => c.id === id);
    },
    findByName: (name: string): Category | undefined => {
      return (fallbackDb.get().categories || []).find(c => c.name.toLowerCase() === name.toLowerCase());
    },
    create: (category: Omit<Category, 'id' | 'createdAt'>): Category => {
      const db = fallbackDb.get();
      if (!db.categories) db.categories = [];
      const newCategory: Category = {
        ...category,
        id: 'cat-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      db.categories.push(newCategory);
      fallbackDb.save(db);
      return newCategory;
    },
    update: (id: string, data: Partial<Omit<Category, 'id' | 'createdAt'>>): Category | undefined => {
      const db = fallbackDb.get();
      if (!db.categories) db.categories = [];
      const idx = db.categories.findIndex(c => c.id === id);
      if (idx === -1) return undefined;
      db.categories[idx] = { ...db.categories[idx], ...data };
      fallbackDb.save(db);
      return db.categories[idx];
    },
    delete: (id: string): boolean => {
      const db = fallbackDb.get();
      if (!db.categories) db.categories = [];
      const len = db.categories.length;
      db.categories = db.categories.filter(c => c.id !== id);
      fallbackDb.save(db);
      return db.categories.length < len;
    }
  }
};
