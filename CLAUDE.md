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

**`ds-select`** (`shared/ui/atoms/select/`) no usa el popup nativo de `<option>` — es imposible de estilar de forma consistente entre navegadores (sin padding, sin ancho propio, sin esquinas redondeadas). Dibuja su propio panel (portado a `document.body` con posición `fixed` calculada a mano, porque varios usos viven dentro de un `ds-modal` cuyo `overflow-y: auto` + `backdrop-filter` recortaría un panel posicionado normalmente). Sigue proyectando `<option>` tal cual las escribe cada página — se leen del DOM vía un `<select>` nativo oculto + `MutationObserver`, no por Angular content queries. **Limitación a tener en cuenta:** al ser 100% custom, se pierde algo de la semántica de accesibilidad nativa del `<select>` (lectores de pantalla) — tiene roles ARIA básicos (`listbox`/`option`) pero no es un reemplazo perfecto. Si la accesibilidad se vuelve una prioridad del proyecto, vale la pena revisar este componente con más cuidado.

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

## Estado (Fases 1–4.5 completas + extensiones)

Implementado: Login, Dashboard, Punto de venta (POS), Productos (multi-categoría vía selector modal, proveedores vinculados), Categorías, Marcas/Líneas, **Proveedores** (`/proveedores`), Inventario (con vista de Kardex por producto/bodega), Bodegas, **Lista de pedidos** (`/lista-pedidos` — flujo Pendientes/Pedidos/Historial, ver abajo), **Domicilios** (`/domicilios`, ver abajo), Caja, Clientes, Cobros, **Métodos de pago** (`/metodos-pago` — catálogo editable por negocio, ver abajo), Reportes (ventas/márgenes/cierres de caja), Sucursales, Usuarios, Alertas (con panel dedicado y notificaciones en vivo, ver abajo), y **Roles y permisos** (`/roles`). El menú principal quedó reducido a Dashboard/Punto de venta/Caja/**Configuración** (`/configuracion`, hub de cards agrupadas — ver abajo) — todo lo demás se navega desde ahí.

Pendiente (ver Roadmap en el doc de arquitectura): devoluciones/facturación electrónica/tienda online (Fase 5). `/negocios` (tier SISTEMA) ya tiene UI propia (crear/editar/desactivar negocios + "Entrar como").

## Lista de pedidos y proveedores

`features/lista-pedidos/` tiene tres pestañas (Pendientes/Pedidos/Historial) siguiendo el estado de `ItemPedido`. "Realizar pedido" muestra el catálogo completo de proveedores (no solo los ya vinculados al producto — se puede vincular uno existente al vuelo) y precarga el costo si ya había un vínculo previo. "Confirmar ingreso" pide la bodega de destino y, si el costo pactado difiere del costo actual del producto, abre un sub-diálogo para decidir si también se actualiza el precio de venta — esa decisión se resuelve en el frontend antes de llamar al backend, en una sola petición. `features/productos/productos-list/` permite vincular proveedores tanto al crear (filas repetibles, patrón igual a `stockInicial`) como al editar (altas/bajas en vivo contra la API, sin pasar por el guardado general del form).

## Punto de venta (POS)

`features/pos/punto-venta/` empezó a partirse en componentes más chicos (primer split de este tipo en el código — no hay otro precedente de padre/hijo con `input()`/`output()` en `features/`). Se extrajeron los clusters menos acoplados a `carrito`/`turno`, dejando el diálogo de cobro/cliente/domicilio (el más grande e interconectado) en `PuntoVenta` para una ronda futura:

- `catalogo-grid-pos/` — grilla de productos, presentacional (`input()` de productos ya filtrados + stock, `output()` de selección).
- `panel-domicilios-pos/` — panel rápido de domicilios, casi autónomo (solo servicios `providedIn: 'root'`).
- `turno-caja-pos/` — FAB de pausar/cerrar caja, sin inputs (cada acción es independiente).
- `ventas-suspendidas-pos/` — suspender/listar/retomar venta. El botón "Suspender venta" vive en `PuntoVenta` (es parte del carrito) y llama a un método público del hijo vía `viewChild` — mismo patrón que ya usaba el buscador para recuperar el foco. **Cuidado con nombres**: la variable de plantilla (`#panelVentasSuspendidas`) y la propiedad `viewChild` de la clase (`suspendidasPanel`) tienen que ser distintas — si coinciden, Angular resuelve el nombre dentro del template como la referencia local (no invocable) en vez de la señal, y `tsc --noEmit` no lo detecta (hace falta `ng build` o el compilador de templates).

`pos-shared.util.ts` unifica `calcularSubtotal`/`calcularImpuesto`/`formatMoney`/`imageUrl`, usado tanto por `PuntoVenta` (carrito activo) como por `ventas-suspendidas-pos` (total de una venta en espera) — antes esa cuenta vivía duplicada.

El escaneo de código de barras (`onKeydownGlobal` en `PuntoVenta`) detecta por velocidad de tecleo, no por foco — ver sección 11 de `../docs/ARQUITECTURA.md`.

## Domicilios

El switch "Domicilio" vive en `features/pos/punto-venta/` (diálogo de cobro), no en la vista de Domicilios — un domicilio siempre nace de una venta. Solo se puede activar con un cliente real ya resuelto (`clienteResueltoId` computado: `clienteId()` en CRÉDITO, `clienteVentaSeleccionado()?.id` en CONTADO — cualquiera de los dos caminos de cliente que ya tenía el POS). Al activarse abre un modal que lista las direcciones guardadas del cliente (`ClientesService.direcciones()`) + "+ Nueva dirección" (mismo idioma sentinel `NUEVA_DIRECCION` que ya usan Lista de pedidos/Productos para "+ nuevo proveedor"); una dirección nueva se guarda de inmediato (`ClientesService.agregarDireccion()`), no se difiere hasta cobrar. `registrarVenta()` manda `domicilio: { direccionClienteId }` en el payload — el backend crea el `Domicilio` en la misma transacción que la venta.

`features/domicilios/domicilios-list/` sigue el mismo esqueleto que `lista-pedidos-list` (pestañas por estado + `ds-modal` para las acciones) y se suscribe a `RealtimeService.on('domicilios:cambio', ...)` para refrescarse sola cuando cualquier sesión del negocio avanza un domicilio. El botón "Nuevo domicilio" navega a `/punto-venta?domicilio=1` — el POS lee ese query param y prende el switch de Domicilio solo apenas se resuelve un cliente (no hay una segunda vía de creación de ventas).

**Panel rápido en el POS**: para que el cajero no tenga que salir de `/punto-venta`, hay un botón fijo abajo a la izquierda ("Domicilios", con badge de activos) que abre un panel calcado del de notificaciones del topbar — lista los domicilios NUEVO/EN_CAMINO con acciones para avanzar de estado ahí mismo (sin pedir quién lo lleva ni motivo de cancelación — esa mayor precisión queda para "Ver más", que navega a `/domicilios`). El estado vive en `core/services/domicilios.service.ts`, ahora un servicio `providedIn: 'root'` con el mismo patrón que `AlertasService`: signal `activos` (NUEVO+EN_CAMINO), poll de respaldo (60s) y una suscripción global a `domicilios:cambio` que dispara un toast "Nuevo domicilio para {cliente}" cuando el evento trae `estado === 'NUEVO'` — un domicilio nace en NUEVO y nunca vuelve a ese estado, así que no hace falta un evento de socket aparte solo para distinguir "recién creado" de "actualizado".

## Confirmaciones y notificaciones

- `ConfirmService` + `ds-confirm-dialog` (montado en `DashboardLayout`) reemplazan el `confirm()` nativo del navegador en toda la app — nunca usar `confirm()` directo, inyectar `ConfirmService` y `await this.confirmService.ask({ message, danger: true })`.
- `RealtimeService` (`core/services/realtime.service.ts`) conecta un socket por sesión (mismo patrón `effect()` que `AlertasService`/`CajaService`) y expone `on(evento, callback)` — los listeners sobreviven a una reconexión/relogin porque se reenganchan solos al socket nuevo. `AlertasService` lo usa para refrescar la campana al instante (`alertas:cambio`); el polling de 30s bajó a 60s y quedó como respaldo si el socket cae.

## Roles y permisos (Fase 4)

`AuthService.tienePermiso(modulo, accion)` reemplaza los viejos `isSuperAdmin`/`isAdminNegocio` — respaldado por un signal `permisos` poblado desde la respuesta de `/auth/login` (una foto para UI, la autorización real siempre la re-chequea el backend — cambiar los permisos de un rol no se refleja en el frontend hasta el próximo login/pin-switch, aunque el backend ya lo aplique de inmediato). El sidebar (`layout/sidebar/sidebar.ts`) filtra `NAV_ITEMS` por `tienePermiso(modulo, 'VER')`, y cada ruta protegida en `app.routes.ts` usa el factory `core/guards/permiso.guard.ts` (protección de UX — la protección real es el `PermissionsGuard` del backend). Pantalla de administración en `features/roles/roles-list/` (matriz de checkboxes Ver/Crear/Editar/Eliminar por módulo, patrón calcado de `features/marcas`) — su `ETIQUETAS_MODULO: Record<ModuloPermiso, string>` tiene que tener una entrada por cada valor de `ModuloPermiso` o el build falla en tiempo de compilación (TS lo fuerza) — no lo olvides al agregar un módulo nuevo.

## Configuración (`/configuracion`) y menú principal

El sidebar quedó reducido a Dashboard/Punto de venta/Caja + un botón "Configuración" anclado abajo (sobre la card de usuario, junto a "Cambiar de cajero"). Todo lo demás (Productos, Categorías, Marcas, Proveedores, Inventario, Bodegas, Lista de pedidos, Clientes, Cobros, Domicilios, Ventas, Reportes, Alertas, Sucursales, Usuarios, Roles, Métodos de pago, Negocios) vive en `/configuracion` (`features/configuracion/configuracion-list/`) como cards de navegación agrupadas por tema — son links a las pantallas completas ya existentes, no hay edición inline. Fuente única de verdad: `core/models/configuracion-menu.model.ts` (`CONFIG_GROUPS`), importada tanto por el Sidebar (para saber cuándo ocultar el botón "Configuración" — ve `modulosAlternativos` en `NavItem`) como por la página — si agregás un módulo nuevo a un grupo existente, alcanza con tocar ese único archivo.

## Métodos de pago (`/metodos-pago`)

CRUD simple (clon de `features/categorias/`) contra el catálogo `metodos_pago` del backend — reemplaza el viejo union type fijo `MetodoPago` (ahora `core/models/metodo-pago.model.ts` es la interfaz del catálogo, y los campos transaccionales tipo `Venta.pagos[].metodoPago` son `string` plano). El switch "Es el método en efectivo" en el modal de crear/editar es exclusivo (el backend desmarca cualquier otro al guardar). `punto-venta.ts` ya no hardcodea la lista de métodos ni compara contra `'EFECTIVO'` — carga `MetodosPagoService.findAll()` al iniciar y deriva `nombreEfectivo = computed(() => metodosPago().find(m => m.esEfectivo)?.nombre)` para el cálculo de vuelto. Los 3 `Record<string,string>` de labels que existían en `caja-home.ts`/`dashboard-home.ts`/`reportes-home.ts` para traducir el enum se eliminaron — el string guardado ya es el nombre legible del catálogo (denormalizado), no hace falta mapear nada.
