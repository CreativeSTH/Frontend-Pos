# CLAUDE.md

Frontend **Angular 20** (standalone + signals) para el panel del POS. Consume `pos-backend` en `http://localhost:3000/api`. Documento de arquitectura general del proyecto: [`../docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md).

## Comandos

```bash
npm start          # ng serve en http://localhost:4200
npm run build       # build de producción
```

## Git

⚠️ **Punto crítico, no se puede vulnerar sin que el usuario lo pida explícitamente en el momento:** solo se commitea y pushea a la rama `develop`. `main` se mantiene vacía (solo el commit inicial) hasta que el usuario pida explícitamente el merge/release — nunca abrir, aceptar ni sugerir de iniciativa propia un PR `develop → main`, ni pushear directo a `main`. Convención de commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`, `style:`. Detalle completo en [`../docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md) sección 17.

## Sistema de Diseño

Estética **glassmorphism oscuro y tecnológico** — sin cards con bordes de color, todo con superficies de vidrio neutras (`--glass-*`) y acentos en degradado (azul→violeta). Ver tokens completos en `src/styles/_tokens.scss`.

Estructura atómica en `src/app/shared/ui/`:

```
atoms/        icon, button, input, badge, avatar, spinner
molecules/    form-field, stat-card, search-bar, empty-state, toast
organisms/    modal, data-table (ds-table shell), toast-container
```

**Regla de oro:** ninguna página escribe estilos de superficie "a mano" (colores, blur, sombras). Todo pasa por los tokens (`var(--glass-bg)`, `var(--radius-lg)`, etc.) o por un componente del DS. Si una página necesita un patrón visual nuevo repetido, ese patrón se sube a `shared/ui`, no se copia.

Los estilos de componente usan `@use 'mixins' as mix;` — el include path `src/styles` está configurado en `angular.json` (`stylePreprocessorOptions`), así que no hace falta ruta relativa.

## Estructura

```
src/app/
├── core/            # ApiService, AuthService, modelos, interceptor JWT, guards
├── shared/ui/        # Design system atómico (ver arriba)
├── layout/           # Sidebar, Topbar, DashboardLayout, AuthLayout
└── features/         # Páginas: auth/login, dashboard, productos, ...
```

## Convenciones

- Componentes standalone, sin NgModules.
- Estado con Signals (`signal()`, `computed()`), nunca propiedades planas para estado reactivo.
- `input()` / `output()` / `model()` en vez de `@Input()`/`@Output()`.
- `@if` / `@for` (con `track`) en vez de `*ngIf` / `*ngFor`.
- `inject()` en vez de inyección por constructor.
- Multi-tenant: el backend ya filtra por negocio vía JWT — el frontend nunca envía `negocioId` manualmente.

## Estado (Fases 1–4 completas)

Implementado: Login, Dashboard, Punto de venta (POS), Productos, Categorías, Inventario (con vista de Kardex por producto/bodega), Bodegas, Caja, Clientes, Cobros, Reportes (ventas/márgenes/cierres de caja), Sucursales, Usuarios, y **Roles y permisos** (`/roles`). El sidebar ya no tiene entradas "Pronto".

Pendiente: UI de gestión de Negocios (tier SISTEMA, hoy solo vía API/seed) y página de Alertas dedicada (el módulo backend existe pero no tiene vista propia) — ninguna es parte formal del roadmap de fases, quedan como mejoras sueltas.

## Roles y permisos (Fase 4)

`AuthService.tienePermiso(modulo, accion)` reemplaza los viejos `isSuperAdmin`/`isAdminNegocio` — respaldado por un signal `permisos` poblado desde la respuesta de `/auth/login` (una foto para UI, la autorización real siempre la re-chequea el backend). El sidebar (`layout/sidebar/sidebar.ts`) filtra `NAV_ITEMS` por `tienePermiso(modulo, 'VER')`, y cada ruta protegida en `app.routes.ts` usa el factory `core/guards/permiso.guard.ts` (protección de UX — la protección real es el `PermissionsGuard` del backend). Pantalla de administración en `features/roles/roles-list/` (matriz de checkboxes Ver/Crear/Editar/Eliminar por módulo, patrón calcado de `features/marcas`).
