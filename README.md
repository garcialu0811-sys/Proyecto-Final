# QRShop - Sistema de Gestión de Inventario y Ventas por Código QR

**QRShop** es un sistema web completo y funcional diseñado para la administración inteligente de inventarios, pedidos y registro de ventas utilizando códigos QR. Construido con una arquitectura robusta en **Next.js (App Router)**, integra bases de datos SQL y NoSQL, autenticación con control de acceso basado en roles (RBAC) y un foro comunitario.

---

## 🎨 Características Destacadas

*   **Diseño Premium y UX Responsiva**: Interfaz fluida (mobile-first, tablet y desktop) con barra lateral colapsable, menú hamburguesa en móviles, animaciones CSS refinadas y soporte nativo para **Modo Claro / Modo Oscuro**.
*   **Gestión por Códigos QR**:
    *   **Generación automática**: Al registrar un producto, se crea un código QR único que codifica su ID de forma visual.
    *   **Descarga Directa**: Los códigos QR se pueden descargar como imágenes PNG desde la interfaz con un solo clic.
    *   **Escaneo Inteligente**: Utiliza la cámara web mediante `html5-qrcode` para leer códigos QR, buscar artículos y registrar ventas. Incluye un simulador de escaneo manual para desarrollo y pruebas.
*   **Control de Acceso por Roles (RBAC)**:
    *   `ADMIN`: Control total. CRUD de productos (con eliminación), moderación del foro, gestión y reasignación de roles y visualización de analíticas globales.
    *   `VENDEDOR`: Puede escanear códigos QR, actualizar el precio y las existencias (pero no eliminar productos), registrar ventas, gestionar entregas y ver sus propias analíticas de ventas.
*   **Arquitectura Dual de Base de Datos (Producción vs Local Fallback)**:
    *   **SQL (PostgreSQL)**: Gestiona usuarios, ventas y pedidos (Prisma ORM).
    *   **NoSQL (MongoDB)**: Gestiona productos, inventario y comentarios/respuestas del foro (Mongoose).
    *   **Fallback Local Integrado**: Si no se configuran credenciales en la nube, el sistema cambia automáticamente a un adaptador JSON local (`data/local_db.json`). ¡El programa funciona de inmediato sin configurar bases de datos externas!
*   **Micro-interacciones**: Celebraciones visuales con ráfagas de confeti (`canvas-confetti`) tras registrar ventas de manera exitosa.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend & Backend (Full-stack)**: Next.js 15+ (React 19, TypeScript, Vanilla CSS).
*   **Autenticación**: NextAuth.js (sesiones seguras en JWT con almacenamiento de rol).
*   **SQL ORM**: Prisma (PostgreSQL).
*   **NoSQL ODM**: Mongoose (MongoDB).
*   **Generador QR**: `qrcode`.
*   **Escáner QR**: `html5-qrcode` (cámara del dispositivo).
*   **Gráficos**: Recharts.
*   **Pruebas**: Vitest + JSDOM.

---

## 🚪 Credenciales de Prueba (Modo Fallback Local)

El sistema viene precargado con tres usuarios para probar los diferentes niveles de acceso:

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@qrshop.com` | `admin123` | Control total, CRUD productos, gestión de roles y moderación. |
| **Vendedor** | `vendedor@qrshop.com` | `vendedor123` | Escanear QR, registrar ventas, cambiar precios/stock, entregas. |

---

## 📂 Estructura de Carpetas

```
/data
  /local_db.json        - Base de datos local autogenerada (JSON)
/prisma
  /schema.prisma        - Esquema SQL para Prisma (PostgreSQL)
/src
  /app
    /api/               - Backend API Routes (auth, products, sales, forum, users, stats)
    /dashboard/         - Panel de control y gráficos
    /forum/             - Hilos y respuestas de discusión
    /login/             - Formulario de acceso (NextAuth)
    /profile/           - Configuración personal y gestión de roles
    /register/          - Registro de vendedores
    /sales/             - Registro de ventas (QR) e historial de entregas
    /globals.css        - Diseño y tema Vanilla CSS global
    /layout.tsx         - Layout raíz y Providers
    /page.tsx           - Catálogo público principal
  /components
    /layout/            - Shell de la app (Sidebar responsiva, Header con tema)
    /ui/                - Contexto de alertas visuales (ToastContext)
  /lib
    /db/                - Adaptador dual de base de datos (fallbackDb y conectores)
    /auth.ts            - Configuración de seguridad de NextAuth.js
    /middleware.ts      - Middleware de protección de rutas basado en roles
  /tests/               - Pruebas unitarias completas
```

---

## 🚀 Instalación y Ejecución Local

Sigue estos pasos para correr QRShop en tu entorno local:

### 1. Clonar o Ubicarse en el Directorio
Asegúrate de que estás en la raíz del proyecto.

### 2. Instalar Dependencias
Instala los paquetes de Node utilizando npm:
```bash
npm install --legacy-peer-deps
```

### 3. Configurar Variables de Entorno
Copia el archivo de ejemplo para crear tu `.env`:
```bash
cp .env.example .env
```
*Nota: Por defecto, `LOCAL_DEV_FALLBACK=true` está configurado para que no necesites conectar bases de datos externas de Supabase o MongoDB Atlas inmediatamente.*

Compila los modelos del ORM para utilizarlos localmente:
```bash
npx prisma generate
```

### 5. Iniciar Servidor de Desarrollo
Lanza el servidor de Next.js:
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación funcionando.

### 6. Ejecutar Pruebas Unitarias
Para correr la suite completa de pruebas unitarias con Vitest:
```bash
npm run test
```

---

## 🌐 Despliegue en Vercel

QRShop está listo para producción. Para subirlo a Vercel:

1. Conecta tu repositorio de GitHub a Vercel.
2. Agrega las siguientes **Variables de Entorno** en el panel de Vercel:
    *   `NEXTAUTH_SECRET`: Clave aleatoria segura.
    *   `NEXTAUTH_URL`: La URL de tu dominio en Vercel.
    *   `DATABASE_URL`: URL de conexión a tu PostgreSQL de producción (ej: Supabase o Neon).
    *   `MONGODB_URI`: URL de conexión a tu MongoDB de producción (ej: MongoDB Atlas).
    *   `LOCAL_DEV_FALLBACK`: Configúralo en `false` para que lea las bases de datos en la nube.
3. Vercel detectará la configuración de Next.js y ejecutará la construcción optimizada automáticamente.
