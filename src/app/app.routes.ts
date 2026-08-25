import { Routes } from '@angular/router';
import { authGuard, guestGuard, landingGuard, soloNegocioGuard } from './core/guards/auth.guard';
import { permisoGuard } from './core/guards/permiso.guard';
import { sucursalGuard } from './core/guards/sucursal.guard';

export const routes: Routes = [
  // landingGuard siempre resuelve a un UrlTree (login, dashboard o punto-venta
  // según haya o no turno de caja abierto) — esta ruta nunca renderiza nada.
  { path: '', pathMatch: 'full', canActivate: [landingGuard], children: [] },
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login').then((m) => m.Login) },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'seleccionar-sucursal',
        loadComponent: () =>
          import('./features/sucursal-selector/sucursal-selector').then((m) => m.SucursalSelector),
      },
      {
        // Sin sucursalGuard a propósito: ese guard redirige acá cuando sucursales.length === 0 —
        // si esta ruta también lo tuviera, se generaría un loop de redirección infinito.
        path: 'asistente',
        canActivate: [soloNegocioGuard, permisoGuard('SUCURSALES', 'CREAR')],
        loadComponent: () => import('./features/asistente/asistente').then((m) => m.Asistente),
      },
      {
        path: 'dashboard',
        canActivate: [soloNegocioGuard, sucursalGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'productos',
        canActivate: [permisoGuard('PRODUCTOS')],
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list').then((m) => m.ProductosList),
      },
      {
        path: 'punto-venta',
        canActivate: [soloNegocioGuard, sucursalGuard],
        loadComponent: () =>
          import('./features/pos/punto-venta/punto-venta').then((m) => m.PuntoVenta),
      },
      {
        path: 'clientes',
        canActivate: [permisoGuard('CLIENTES')],
        loadComponent: () =>
          import('./features/clientes/clientes-list/clientes-list').then((m) => m.ClientesList),
      },
      {
        path: 'domicilios',
        canActivate: [permisoGuard('DOMICILIOS')],
        loadComponent: () =>
          import('./features/domicilios/domicilios-list/domicilios-list').then((m) => m.DomiciliosList),
      },
      {
        path: 'cobros',
        canActivate: [permisoGuard('COBROS')],
        loadComponent: () => import('./features/cobros/cobros-list/cobros-list').then((m) => m.CobrosList),
      },
      {
        path: 'categorias',
        canActivate: [permisoGuard('CATEGORIAS')],
        loadComponent: () =>
          import('./features/categorias/categorias-list/categorias-list').then((m) => m.CategoriasList),
      },
      {
        path: 'marcas',
        canActivate: [permisoGuard('MARCAS')],
        loadComponent: () =>
          import('./features/marcas/marcas-list/marcas-list').then((m) => m.MarcasList),
      },
      {
        path: 'proveedores',
        canActivate: [permisoGuard('PROVEEDORES')],
        loadComponent: () =>
          import('./features/proveedores/proveedores-list/proveedores-list').then((m) => m.ProveedoresList),
      },
      {
        path: 'inventario',
        canActivate: [permisoGuard('INVENTARIO')],
        loadComponent: () =>
          import('./features/inventario/inventario-list/inventario-list').then((m) => m.InventarioList),
      },
      {
        path: 'bodegas',
        canActivate: [permisoGuard('BODEGAS')],
        loadComponent: () =>
          import('./features/bodegas/bodegas-list/bodegas-list').then((m) => m.BodegasList),
      },
      {
        path: 'lista-pedidos',
        canActivate: [permisoGuard('INVENTARIO')],
        loadComponent: () =>
          import('./features/lista-pedidos/lista-pedidos-list/lista-pedidos-list').then(
            (m) => m.ListaPedidosList,
          ),
      },
      {
        path: 'caja',
        canActivate: [permisoGuard('CAJA'), sucursalGuard],
        loadComponent: () => import('./features/caja/caja-home/caja-home').then((m) => m.CajaHome),
      },
      {
        path: 'ventas',
        canActivate: [permisoGuard('VENTAS')],
        loadComponent: () => import('./features/ventas/ventas-list/ventas-list').then((m) => m.VentasList),
      },
      {
        path: 'mi-negocio',
        canActivate: [permisoGuard('NEGOCIO')],
        loadComponent: () => import('./features/negocio-datos/negocio-datos').then((m) => m.NegocioDatos),
      },
      {
        path: 'sucursales',
        canActivate: [permisoGuard('SUCURSALES')],
        loadComponent: () =>
          import('./features/sucursales/sucursales-list/sucursales-list').then((m) => m.SucursalesList),
      },
      {
        path: 'usuarios',
        canActivate: [permisoGuard('USUARIOS')],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosList),
      },
      {
        path: 'roles',
        canActivate: [permisoGuard('ROLES')],
        loadComponent: () => import('./features/roles/roles-list/roles-list').then((m) => m.RolesList),
      },
      {
        path: 'negocios',
        canActivate: [permisoGuard('NEGOCIOS')],
        loadComponent: () =>
          import('./features/negocios/negocios-list/negocios-list').then((m) => m.NegociosList),
      },
      {
        path: 'reportes',
        canActivate: [permisoGuard('REPORTES')],
        loadComponent: () =>
          import('./features/reportes/reportes-home/reportes-home').then((m) => m.ReportesHome),
      },
      {
        path: 'alertas',
        canActivate: [permisoGuard('ALERTAS')],
        loadComponent: () => import('./features/alertas/alertas-list/alertas-list').then((m) => m.AlertasList),
      },
      {
        path: 'graficos',
        canActivate: [permisoGuard('GRAFICOS')],
        loadComponent: () => import('./features/graficos/graficos-list/graficos-list').then((m) => m.GraficosList),
      },
      {
        path: 'graficos/wizard',
        canActivate: [permisoGuard('GRAFICOS', 'CREAR')],
        loadComponent: () =>
          import('./features/graficos/graficos-wizard/graficos-wizard').then((m) => m.GraficosWizard),
      },
      {
        path: 'metodos-pago',
        canActivate: [permisoGuard('METODOS_PAGO')],
        loadComponent: () =>
          import('./features/metodos-pago/metodos-pago-list/metodos-pago-list').then(
            (m) => m.MetodosPagoList,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion-list/configuracion-list').then(
            (m) => m.ConfiguracionList,
          ),
      },
      {
        path: 'configuracion/dispositivos',
        canActivate: [permisoGuard('CAJA')],
        loadComponent: () =>
          import('./features/configuracion/dispositivos/dispositivos').then((m) => m.Dispositivos),
      },
      {
        path: 'configuracion/facturacion',
        canActivate: [permisoGuard('FACTURACION')],
        loadComponent: () =>
          import('./features/facturacion/facturacion-list/facturacion-list').then((m) => m.FacturacionList),
      },
      {
        path: 'configuracion/facturacion/wizard',
        canActivate: [permisoGuard('FACTURACION', 'CREAR')],
        loadComponent: () =>
          import('./features/facturacion/facturacion-wizard/facturacion-wizard').then((m) => m.FacturacionWizard),
      },
      {
        path: 'configuracion/cupones',
        canActivate: [permisoGuard('CUPONES')],
        loadComponent: () =>
          import('./features/cupones/cupones-list/cupones-list').then((m) => m.CuponesList),
      },
      {
        path: 'configuracion/cupones/wizard',
        canActivate: [permisoGuard('CUPONES', 'CREAR')],
        loadComponent: () =>
          import('./features/cupones/cupones-wizard/cupones-wizard').then((m) => m.CuponesWizard),
      },
      {
        path: 'configuracion/pagos-wompi',
        canActivate: [permisoGuard('PAGOS', 'EDITAR')],
        loadComponent: () =>
          import('./features/configuracion/pagos-wompi/pagos-wompi').then((m) => m.PagosWompi),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
