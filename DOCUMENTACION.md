# DOCUMENTACION TECNICA - QRShop

## 1. Resumen del Proyecto

**QRShop** es un sistema web completo de gestion de inventario y ventas para pequenos negocios
en Guatemala. Permite gestionar productos con codigos QR, controlar inventario, procesar ventas
y pedidos en linea, y administrar usuarios con diferentes roles de acceso.

- **URL Produccion:** https://qrshop-chi.vercel.app
- **Plataforma de despliegue:** Vercel
- **Base de datos:** Supabase (PostgreSQL) + MongoDB Atlas
- **Idioma:** Espanol (es-GT)

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 16 + React 19 + Tailwind CSS 4         │
│  Zustand (estado) + Framer Motion (animaciones) │
└──────────────────────┬──────────────────────────┘
                       │ API Routes (Next.js)
┌──────────────────────▼──────────────────────────┐
│                API LAYER (30+ endpoints)         │
│  NextAuth.js (auth) + Zod (validacion)          │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│          CAPA DE ABSTRACCION (dbClient.ts)       │
│   Unifica 3 fuentes de datos detras de una      │
│   interfaz comun: dbClient.users.*,              │
│   dbClient.products.*, dbClient.orders.*, etc.   │
└──────┬───────────────┬──────────────┬───────────┘
       │               │              │
┌──────▼──────┐ ┌──────▼──────┐ ┌────▼────────────┐
│  PostgreSQL │ │   MongoDB   │ │  JSON Fallback   │
│  (Supabase) │ │   (Atlas)   │ │  (local_db.json) │
│  via Prisma │ │  via Mongoose│ │  Cuando falla DB │
└─────────────┘ └─────────────┘ └─────────────────┘
```

---

## 3. Stack Tecnologico Completo

### Frontend
| Tecnologia | Version | Uso |
|---|---|---|
| Next.js | 16.2.10 | Framework React (App Router) |
| React | 19.2.4 | UI Library |
| React DOM | 19.2.4 | Renderizado DOM |
| TypeScript | ^5 | Tipado estatico |
| Tailwind CSS | ^4 | Estilos (via PostCSS, zero-config) |
| Framer Motion | ^12.42.2 | Animaciones |
| Lucide React | ^1.23.0 | Iconografia |
| Recharts | ^3.9.1 | Graficas/dashboard |
| React Hook Form | ^7.80.0 | Formularios |
| Zod | ^4.4.3 | Validacion de esquemas |
| Zustand | ^5.0.14 | Estado global (carrito, favoritos) |
| canvas-confetti | ^1.9.4 | Efecto confetti |
| html5-qrcode | ^2.3.8 | Escaneo QR desde navegador |
| qrcode | ^1.5.4 | Generacion de codigos QR |

### Backend / API
| Tecnologia | Version | Uso |
|---|---|---|
| NextAuth.js | ^4.24.14 | Autenticacion (JWT + Providers) |
| Prisma | ^7.8.0 | ORM para PostgreSQL |
| @prisma/client | ^7.8.0 | Cliente Prisma |
| @prisma/adapter-pg | ^7.8.0 | Adapter PostgreSQL (PrismaPg) |
| pg | ^8.22.0 | Driver PostgreSQL nativo |
| Mongoose | ^9.7.3 | ODM para MongoDB |
| bcryptjs | ^3.0.3 | Hashing de passwords |
| dotenv | ^17.4.2 | Variables de entorno |
| Cloudinary | ^2.10.0 | Almacenamiento de imagenes |

### Base de Datos
| Tecnologia | Tipo | Uso |
|---|---|---|
| PostgreSQL (Supabase) | Relacional | Users, Roles, Permissions, Sales, Orders |
| MongoDB (Atlas) | No relacional | Products, ForumPosts, ForumReplies |
| JSON local (local_db.json) | Archivo | Fallback cuando fallan las DBs |

### DevOps / Testing
| Tecnologia | Version | Uso |
|---|---|---|
| Vercel | - | Hosting y despliegue continuo |
| Vitest | ^4.1.9 | Testing framework |
| @testing-library/react | ^16.3.2 | Testing de componentes |
| @testing-library/jest-dom | ^6.9.1 | Matchers de DOM para tests |
| jsdom | ^29.1.1 | Simulacion de DOM para tests |
| ESLint | ^9 | Linting |
| eslint-config-next | 16.2.10 | Reglas ESLint para Next.js |

### Herramientas Externas
| Herramienta | Uso |
|---|---|
| GitHub | Control de versiones |
| Supabase Dashboard | Administracion PostgreSQL |
| MongoDB Atlas | Administracion MongoDB |
| Cloudinary Dashboard | Administracion de imagenes |

---

## 4. Base de Datos Relacional - PostgreSQL (Supabase)

**Proveedor:** Supabase (AWS us-east-1)
**Cliente ORM:** Prisma 7.8.0 con adapter PrismaPg
**Conexion:** Pooler (port 6543) para app, Direct (port 5432) para prisma db push

### Modelos en Prisma

#### User
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| email | String | Unico |
| password | String | Hash bcrypt |
| name | String | Nombre completo |
| role | String | ADMIN, VENDEDOR |
| phone | String? | Telefono |
| isActive | Boolean | Activo/inactivo |
| lastLogin | DateTime? | Ultimo acceso |
| createdAt | DateTime | Automatico |
| updatedAt | DateTime | Automatico |

#### Role
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| name | String | Unico |
| displayName | String? | Nombre para mostrar |
| description | String? | Descripcion |
| icon | String? | Icono |
| color | String? | Color |
| isActive | Boolean | Activo/inactivo |
| isSystem | Boolean | Rol del sistema |

#### Permission
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| roleId | String | FK -> Role (CASCADE) |
| module | String | Modulo |
| action | String | Accion |
| isEnabled | Boolean | Habilitado |
| | | Unica: @@unique([roleId, module, action]) |

#### Sale
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| productId | String | ID del producto |
| productName | String | Nombre del producto |
| quantity | Int | Cantidad |
| price | Float | Precio unitario |
| total | Float | Total |
| sellerId | String | FK -> User |
| createdAt | DateTime | Automatico |

#### Order
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| orderNumber | String | Unico, auto-generado |
| userId | String? | FK -> User |
| clientName | String | Nombre del cliente |
| clientPhone | String? | Telefono |
| clientAddress | String? | Direccion |
| phone | String? | Telefono alternate |
| address | String? | Direccion alternate |
| city | String? | Ciudad |
| zone | String? | Zona |
| reference | String? | Referencia |
| productName | String | Producto principal |
| quantity | Int | Cantidad |
| price | Float | Precio |
| total | Float | Total |
| status | String | PENDIENTE/PROCESANDO/EN_RUTA/ENTREGADO/CANCELADO |
| paymentMethod | String? | Metodo de pago |
| subtotal | Float? | Subtotal |
| shipping | Float? | Envio |
| discount | Float? | Descuento |
| driverId | String? | Repartidor |
| driverName | String? | Nombre repartidor |
| notes | String? | Notas |
| deliveredAt | DateTime? | Fecha entrega |

#### OrderItem
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| orderId | String | FK -> Order (CASCADE) |
| productId | String | ID producto |
| productName | String | Nombre producto |
| sku | String? | SKU |
| price | Float | Precio |
| quantity | Int | Cantidad |
| subtotal | Float | Subtotal |
| image | String? | URL imagen |

#### OrderHistory
| Campo | Tipo | Descripcion |
|---|---|---|
| id | String (UUID) | PK |
| orderId | String | FK -> Order (CASCADE) |
| status | String | Estado |
| note | String? | Nota |
| createdAt | DateTime | Automatico |

---

## 5. Base de Datos No Relacional - MongoDB (Mongoose)

**Proveedor:** MongoDB Atlas (configurado via MONGODB_URI)
**Cliente ODM:** Mongoose 9.7.3
**Nota:** MONGODB_URI no esta configurada actualmente en .env. Los datos caen al fallback JSON.

### Modelos en Mongoose

#### MongooseProduct
| Campo | Tipo | Descripcion |
|---|---|---|
| _id | ObjectId | PK automatico |
| name | String | Nombre |
| description | String? | Descripcion |
| price | Number | Precio |
| sku | String? | SKU |
| qrCode | String? | Codigo QR |
| image | String? | URL imagen |
| category | String? | Categoria |
| stock | Number | Stock actual |
| minStock | Number | Stock minimo |
| isActive | Boolean | Activo |

#### MongooseForumPost
| Campo | Tipo | Descripcion |
|---|---|---|
| _id | ObjectId | PK |
| title | String | Titulo |
| content | String | Contenido |
| authorName | String | Autor |
| authorEmail | String | Email autor |
| category | String | Categoria |
| replies | Number | Conteo respuestas |
| createdAt | Date | Fecha creacion |

#### MongooseForumReply
| Campo | Tipo | Descripcion |
|---|---|---|
| _id | ObjectId | PK |
| postId | String | FK -> ForumPost |
| content | String | Contenido |
| authorName | String | Autor |
| authorEmail | String | Email autor |
| createdAt | Date | Fecha creacion |

---

## 6. Base de Datos Fallback - JSON Local

**Archivo:** `data/local_db.json`
**Lineas de codigo:** 768 (fallbackDb.ts)

**Cuando se usa:**
- Variable `LOCAL_DEV_FALLBACK=true` en .env
- Cuando falla la conexion a PostgreSQL
- Cuando falla la conexion a MongoDB
- Cuando MONGODB_URI no esta configurado

**Contenido pre-cargado:**
- 3 usuarios (admin@qrshop.com, vendedor@qrshop.com, cliente@qrshop.com)
- 6 productos de ejemplo
- 2 ventas de ejemplo
- 2 pedidos de ejemplo
- 5 movimientos de inventario
- 2 publicaciones del foro
- 1 respuesta del foro
- 8 categorias

---

## 7. Capa de Abstraccion - dbClient.ts

El archivo `src/lib/db/dbClient.ts` (612 lineas) es el nucleo de la arquitectura.
Proporciona una interfaz unica que abstracta las 3 fuentes de datos:

```
dbClient.users.*      → Prisma (PostgreSQL) → fallback JSON
dbClient.roles.*      → Prisma (PostgreSQL)
dbClient.permissions.* → Prisma (PostgreSQL)
dbClient.sales.*      → Prisma (PostgreSQL) → fallback JSON
dbClient.orders.*     → Prisma (PostgreSQL) → fallback JSON
dbClient.products.*   → MongoDB (Mongoose) → fallback JSON
dbClient.forumPosts.* → MongoDB (Mongoose) → fallback JSON
dbClient.forumReplies.* → MongoDB (Mongoose) → fallback JSON
dbClient.categories.* → fallback JSON
dbClient.movements.*  → fallback JSON
dbClient.notifications.* → fallback JSON
```

**Logica de routing:**
1. Si `LOCAL_DEV_FALLBACK=true`, usar JSON directamente
2. Si no, intentar la base de datos primaria (Prisma o Mongoose)
3. Si falla, caer al fallback JSON

---

## 8. Autenticacion y Roles

### Proveedor de Auth: NextAuth.js v4

**Estrategia:** JWT (30 dias de expiracion)

**Providers:**
1. **Credentials** — Email + Password (bcryptjs)
2. **Google OAuth** — Login con Google (CLIENTE role por defecto)

### Roles (RBAC - 3 niveles)

| Rol | Permisos |
|---|---|
| **ADMIN** | Acceso total: CRUD usuarios, roles, productos, ventas, pedidos, dashboard, inventario, categorias, foro, configuracion |
| **VENDEDOR** | Dashboard, ventas, inventario, categorias, escaneo QR, entregas, pedidos, foro |


### Middleware de Proteccion de Rutas

Rutas protegidas por middleware (requieren autenticacion):
- `/dashboard/*`, `/sales/*`, `/categories/*`, `/inventory/*`, `/scan/*`
- `/orders/*`, `/deliveries/*`
- `/users/*`, `/roles/*` (solo ADMIN)
- `/profile/*`, `/forum/*`

Rutas publicas (sin auth):
- `/store/*`, `/checkout/*`, `/login`, `/register`
- `/api/products/public/*`, `/api/products/qr/*`

---

## 9. Modulos/Rutas de la Aplicacion

### Paginas (24)
| Ruta | Modulo | Acceso |
|---|---|---|
| `/` | Home (CRUD productos) | ADMIN/VENDEDOR |
| `/login` | Login | Publico |
| `/register` | Registro | Publico |
| `/dashboard` | Dashboard (metricas) | ADMIN/VENDEDOR |
| `/products` | Gestion productos | ADMIN/VENDEDOR |
| `/categories` | Gestion categorias | ADMIN/VENDEDOR |
| `/inventory` | Inventario | ADMIN/VENDEDOR |
| `/sales` | Ventas | ADMIN/VENDEDOR |
| `/orders` | Router de pedidos | Segun rol |
| `/orders/client` | Mis pedidos (CLIENTE) | CLIENTE |
| `/orders/admin` | Pedidos (ADMIN/VENDEDOR) | ADMIN/VENDEDOR |
| `/deliveries` | Entregas | ADMIN/VENDEDOR |
| `/scan` | Escaner QR | ADMIN/VENDEDOR |
| `/store` | Tienda publica | Publico |
| `/checkout` | Checkout | Publico |
| `/favoritos` | Favoritos | CLIENTE |
| `/users` | Gestion usuarios | ADMIN |
| `/roles` | Gestion roles | ADMIN |
| `/profile` | Perfil | Todos autenticados |
| `/forum` | Foro comunitario | Todos autenticados |
| `/settings` | Configuracion | ADMIN/VENDEDOR |

### API Routes (30+)
| Endpoint | Metodos | Descripcion |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler |
| `/api/auth/register` | POST | Registro de usuarios |
| `/api/users` | GET, POST | CRUD usuarios |
| `/api/users/[id]` | GET, PUT, DELETE | Usuario individual |
| `/api/user/profile` | GET, PUT | Perfil propio |
| `/api/roles` | GET, POST | CRUD roles |
| `/api/roles/[id]` | GET, PUT, DELETE | Rol individual |
| `/api/roles/[id]/permissions` | GET, PUT | Permisos del rol |
| `/api/products` | GET, POST | CRUD productos |
| `/api/products/[id]` | GET, PUT, DELETE | Producto individual |
| `/api/products/public` | GET | Productos publicos (tienda) |
| `/api/products/qr/[qrCode]` | GET | Producto por QR |
| `/api/categories` | GET, POST | CRUD categorias |
| `/api/categories/[id]` | GET, PUT, DELETE | Categoria individual |
| `/api/inventory` | GET | Inventario |
| `/api/inventory/movement` | GET, POST | Movimientos inventario |
| `/api/sales` | GET, POST | Ventas |
| `/api/orders` | GET, POST | Pedidos (admin) |
| `/api/orders/[id]` | GET, PUT, DELETE | Pedido individual |
| `/api/orders/client` | GET, POST | Pedidos del cliente |
| `/api/orders/client/[id]` | GET | Pedido del cliente |
| `/api/orders/client/[id]/cancel` | PUT | Cancelar pedido |
| `/api/orders/guest` | POST | Pedido sin cuenta |
| `/api/dashboard` | GET | Metricas dashboard |
| `/api/forum/posts` | GET, POST | Publicaciones foro |
| `/api/forum/posts/[id]` | GET, PUT, DELETE | Publicacion individual |
| `/api/forum/replies` | GET, POST | Respuestas foro |
| `/api/forum/replies/[id]` | PUT, DELETE | Respuesta individual |
| `/api/upload` | POST | Subir imagenes |
| `/api/notifications` | GET | Notificaciones |

---

## 10. Servicios Externos

### Cloudinary (Almacenamiento de imagenes)
- **SDK:** cloudinary v2.10.0
- **Funciones:** uploadImage(), deleteImage(), getPublicIdFromUrl()
- **Carpeta:** `qrshop/products`
- **Formatos:** JPEG, PNG, WebP, GIF
- **Tamano maximo:** 5MB
- **API:** `/api/upload`

### Google OAuth
- **Libreria:** NextAuth GoogleProvider
- **Variables:** GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Rol por defecto:** VENDEDOR
- **Auto-creacion:** Crea usuario al primer login con Google

---

## 11. Estado del Carrito (Zustand)

| Store | Archivo | Funciones |
|---|---|---|
| cartStore | `src/lib/store/cartStore.ts` | addItem, removeItem, updateQuantity, clearCart, getTotal |
| favoritesStore | `src/lib/store/favoritesStore.ts` | addFavorite, removeFavorite, isFavorite |

---

## 12. Variables de Entorno

| Variable | Requerida | Descripcion |
|---|---|---|
| DATABASE_URL | Si | PostgreSQL (Supabase pooler, port 6543) |
| DIRECT_URL | Si | PostgreSQL (Supabase direct, port 5432) |
| NEXTAUTH_SECRET | Si | Secreto para JWTs |
| NEXTAUTH_URL | Si | URL base (https://qrshop-chi.vercel.app) |
| GOOGLE_CLIENT_ID | No | Google OAuth Client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth Client Secret |
| MONGODB_URI | No | MongoDB Atlas connection string |
| LOCAL_DEV_FALLBACK | No | Usar JSON fallback (true/false) |
| CLOUDINARY_CLOUD_NAME | No | Cloudinary cloud name |
| CLOUDINARY_API_KEY | No | Cloudinary API key |
| CLOUDINARY_API_SECRET | No | Cloudinary API secret |

---

## 13. Problemas Conocidos / Deuda Tecnica

1. **Seguridad:** Secret hardcoded como fallback en auth.ts (`qrshop-secret-super-key-12345678`)
2. **Passwords:** Plaintext passwords en datos seed del fallback JSON
3. **.env expuesto:** Archivo .env contiene credenciales reales de produccion
4. **MongoDB no conectado:** MONGODB_URI no configurado, todo cae a JSON fallback
5. **Cloudinary no conectado:** Variables de Cloudinary no en .env de produccion
6. **Sin rate limiting:** API routes no tienen proteccion contra abuso
7. **Sin tests escritos:** Vitest configurado pero no hay archivos de test
8. **next.config.ts vacio:** Sin configuracion de dominios de imagenes, sin optimizaciones
9. **@types/bcryptjs en dependencies:** Deberia estar en devDependencies
10. **@types/mongoose desactualizado:** v5 vs Mongoose v9
