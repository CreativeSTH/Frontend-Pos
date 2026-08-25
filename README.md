# pos-frontend

Frontend del sistema POS multi-negocio — **Angular 20** (standalone components + signals). Una sola app que cubre el punto de venta (cajero) y el back-office (administrador), separados por permisos de rol.

Documento de arquitectura general del proyecto: [`../docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md).

## Stack

- **Angular 20**, componentes standalone, estado con Signals
- `@if`/`@for` en vez de `*ngIf`/`*ngFor`, `input()`/`output()`/`model()`, `inject()`
- Sistema de diseño propio en `shared/ui/` (atómico: atoms/molecules/organisms)
- **3 temas visuales** seleccionables en vivo: Glass (glassmorphism oscuro), SaaS oscuro y SaaS claro
- Socket.IO client para notificaciones en tiempo real (alertas, domicilios)

## Requisitos

- Node.js 20+
- [`pos-backend`](https://github.com/CreativeSTH/api-astralis-pos) corriendo en `http://localhost:3000/api`

## Puesta en marcha

```bash
npm install
npm start          # ng serve en http://localhost:4200
```

La app se recarga sola al modificar cualquier archivo fuente. Necesita el backend arriba para poder loguear y traer datos.

```bash
npm run build       # build de producción (dist/)
```

## Estructura

```
src/app/
├── core/            # ApiService, AuthService, modelos, interceptor JWT, guards
├── shared/ui/        # Design system: atoms/molecules/organisms + design tokens
├── layout/           # Sidebar, Topbar, DashboardLayout, AuthLayout
└── features/         # Páginas: auth, dashboard, punto-venta, productos, caja, ...
```

Menú principal reducido a Dashboard / Punto de venta / Caja + un hub de "Configuración" que agrupa el resto de los módulos (Productos, Inventario, Proveedores, Clientes, Domicilios, Reportes, Roles, Usuarios, etc.) como cards de navegación.

## Convenciones de diseño

Ninguna pantalla escribe estilos de superficie "a mano" (colores, blur, sombras) — todo pasa por los tokens de `src/styles/_tokens.scss` o por un componente del design system. Ver la sección "Sistema de Diseño" de [`../docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md) y el `CLAUDE.md` de este repo para el detalle completo.

## Repos relacionados

| Repo | Rol |
|---|---|
| [`pos-backend`](https://github.com/CreativeSTH/api-astralis-pos) | API REST (NestJS + PostgreSQL) |
| [`pos-agent`](https://github.com/CreativeSTH/Pos-Agent) | Puente local a impresora térmica/cajón, corre en la PC de caja |

## Git

Se commitea y pushea solo a `develop`. `main` recibe merges únicamente cuando se pide explícitamente un release — ver sección 17 de `ARQUITECTURA.md`.
