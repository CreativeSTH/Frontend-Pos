import { Routes } from '@angular/router';
import { authGuard, guestGuard, landingGuard } from './core/guards/auth.guard';

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
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list').then((m) => m.ProductosList),
      },
      {
        path: 'punto-venta',
        loadComponent: () =>
          import('./features/pos/punto-venta/punto-venta').then((m) => m.PuntoVenta),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-list/clientes-list').then((m) => m.ClientesList),
      },
      {
        path: 'cobros',
        loadComponent: () => import('./features/cobros/cobros-list/cobros-list').then((m) => m.CobrosList),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias-list/categorias-list').then((m) => m.CategoriasList),
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./features/marcas/marcas-list/marcas-list').then((m) => m.MarcasList),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario-list/inventario-list').then((m) => m.InventarioList),
      },
      {
        path: 'bodegas',
        loadComponent: () =>
          import('./features/bodegas/bodegas-list/bodegas-list').then((m) => m.BodegasList),
      },
      {
        path: 'caja',
        loadComponent: () => import('./features/caja/caja-home/caja-home').then((m) => m.CajaHome),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/ventas/ventas-list/ventas-list').then((m) => m.VentasList),
      },
      {
        path: 'sucursales',
        loadComponent: () =>
          import('./features/sucursales/sucursales-list/sucursales-list').then((m) => m.SucursalesList),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosList),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes-home/reportes-home').then((m) => m.ReportesHome),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
