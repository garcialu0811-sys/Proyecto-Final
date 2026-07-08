# Checklist de Tareas - QRShop

- [x] **Paso 1: Inicialización de Proyecto y Dependencias**
  - [x] Crear la aplicación Next.js mediante `create-next-app`.
  - [x] Instalar todas las dependencias necesarias (lucide-react, next-auth, prisma, mongoose, qrcode, html5-qrcode, recharts, framer-motion, react-hook-form, zod, canvas-confetti, etc.).
  - [x] Configurar TypeScript, Vitest y alias de importación (`@/*`).
  - [x] Crear archivos globales de estilos (`globals.css`) con variables de colores premium.

- [x] **Paso 2: Capa de Base de Datos y Modelos (Prisma/Mongoose/Local Fallback)**
  - [x] Configurar esquema de Prisma para PostgreSQL (User, Sale, Order).
  - [x] Configurar esquemas de Mongoose para MongoDB (Product, ForumPost, ForumReply).
  - [x] Diseñar el adaptador de base de datos local unificado (localFallback) para cuando no hay credenciales externas.
  - [x] Generar e inicializar el cliente de Prisma.

- [x] **Paso 3: Módulo de Autenticación y Autorización (NextAuth.js)**
  - [x] Implementar la configuración de NextAuth (rutas de credenciales de login y registro).
  - [x] Proteger rutas y APIs mediante middleware y validación de sesiones con roles (ADMIN, VENDEDOR, CLIENTE).
  - [x] Diseñar pantallas UI premium para Login y Registro.

- [x] **Paso 4: Maquetación y Shell de la Aplicación**
  - [x] Implementar Sidebar colapsable responsiva con íconos Lucide.
  - [x] Crear Header con notificaciones y selector de tema claro/oscuro.
  - [x] Estructurar layouts para escritorio (grid de columnas) y móviles (menú colapsable flotante).

- [x] **Paso 5: Módulo de Gestión de Inventario y Productos**
  - [x] Desarrollar interfaz de listado de productos con paginación, filtros de categoría y búsqueda.
  - [x] Crear formulario CRUD de producto con validación de datos Zod y react-hook-form.
  - [x] Generar y mostrar códigos QR descargables al crear o ver un producto.
  - [x] Diseñar e integrar la cámara web con `html5-qrcode` en un modal para lectura de códigos QR.

- [x] **Paso 6: Módulo de Registro de Ventas y Pedidos**
  - [x] Implementar pantalla para registrar ventas asociadas a productos (escaneando QR o búsqueda manual).
  - [x] Controlar la actualización automática del inventario (restar stock en MongoDB) tras una venta.
  - [x] Crear gestión de pedidos en base de datos SQL con estados y opción de asignar repartidores.

- [x] **Paso 7: Módulo de Foro de Comunidad**
  - [x] Diseñar interfaz para crear hilos y publicaciones categorizadas (Reseñas, Dudas, Sugerencias).
  - [x] Desarrollar lógica de respuestas anidadas en hilos de discusión.
  - [x] Habilitar controles de moderación para que los administradores oculten/eliminen hilos.

- [x] **Paso 8: Dashboard de Estadísticas y Gráficos**
  - [x] Crear widgets de resumen dinámicos basados en el rol (Admin vs Vendedor).
  - [x] Integrar gráficos interactivos de ventas semanales con Recharts.
  - [x] Mostrar alertas de stock bajo y tabla de ventas recientes con filtros avanzados.

- [x] **Paso 9: Configuración de Perfil**
  - [x] Diseñar pantalla para edición de perfil y preferencias.
  - [x] Implementar pantalla de gestión de roles y usuarios exclusiva para Administradores.

- [x] **Paso 10: Pruebas Unitarias**
  - [x] Escribir y configurar pruebas con Vitest para validaciones de rol, cálculo de estadísticas, CRUD y decodificación QR.
  - [x] Ejecutar el conjunto de pruebas y asegurar que pasen con éxito.

- [x] **Paso 11: Documentación y Entrega**
  - [x] Crear archivo `.env.example`.
  - [x] Escribir un `README.md` detallado con instrucciones de despliegue y uso de la base de datos local fallback.
  - [x] Crear informe de Walkthrough de cambios.
