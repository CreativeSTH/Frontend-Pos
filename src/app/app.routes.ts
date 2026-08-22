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
    ],
  },
  { path: '**', redirectTo: '' },
];
