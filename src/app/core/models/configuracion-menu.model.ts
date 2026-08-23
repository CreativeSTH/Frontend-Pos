import { AccionPermiso, ModuloPermiso } from './auth.model';

export interface ConfiguracionCard {
  label: string;
  description: string;
  icon: string;
  route: string;
  modulo: ModuloPermiso;
  /** Default 'VER' — algunas cards (el asistente) necesitan un permiso más fuerte para que valga la pena mostrarlas. */
  accion?: AccionPermiso;
}

export interface ConfiguracionGroup {
  titulo: string;
  items: ConfiguracionCard[];
}

/** Fuente única de verdad para la vista `/configuracion` y para saber cuándo mostrar el ítem del sidebar. */
export const CONFIG_GROUPS: ConfiguracionGroup[] = [
  {
    titulo: 'Catálogo',
    items: [
      { label: 'Productos', description: 'Catálogo, precios e impuestos', icon: 'box', route: '/productos', modulo: 'PRODUCTOS' },
      { label: 'Categorías', description: 'Organización jerárquica del catálogo', icon: 'layers', route: '/categorias', modulo: 'CATEGORIAS' },
      { label: 'Marcas', description: 'Marcas y líneas de producto', icon: 'tag', route: '/marcas', modulo: 'MARCAS' },
      { label: 'Proveedores', description: 'Proveedores y costos por producto', icon: 'truck', route: '/proveedores', modulo: 'PROVEEDORES' },
      { label: 'Inventario', description: 'Existencias por bodega y kardex', icon: 'archive', route: '/inventario', modulo: 'INVENTARIO' },
      { label: 'Bodegas', description: 'Bodegas de almacenamiento por sucursal', icon: 'layers', route: '/bodegas', modulo: 'BODEGAS' },
      { label: 'Lista de pedidos', description: 'Flujo de compra a proveedores', icon: 'clipboard', route: '/lista-pedidos', modulo: 'INVENTARIO' },
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { label: 'Clientes', description: 'Cartera de clientes y cupo de crédito', icon: 'users', route: '/clientes', modulo: 'CLIENTES' },
      { label: 'Cobros', description: 'Cuotas y pagos de ventas a crédito', icon: 'wallet', route: '/cobros', modulo: 'COBROS' },
      { label: 'Domicilios', description: 'Entregas a domicilio en curso', icon: 'map-pin', route: '/domicilios', modulo: 'DOMICILIOS' },
    ],
  },
  {
    titulo: 'Ventas y reportes',
    items: [
      { label: 'Ventas', description: 'Historial completo de ventas', icon: 'receipt', route: '/ventas', modulo: 'VENTAS' },
      { label: 'Reportes', description: 'Ventas, márgenes y cierres de caja', icon: 'bar-chart', route: '/reportes', modulo: 'REPORTES' },
      { label: 'Alertas', description: 'Notificaciones y reglas de alerta', icon: 'bell', route: '/alertas', modulo: 'ALERTAS' },
    ],
  },
  {
    titulo: 'Negocio',
    items: [
      { label: 'Sucursales', description: 'Sucursales y metas de venta', icon: 'store', route: '/sucursales', modulo: 'SUCURSALES' },
      { label: 'Asistente de configuración', description: 'Guía paso a paso para dejar una sucursal lista: bodega y productos', icon: 'layers', route: '/asistente', modulo: 'SUCURSALES', accion: 'CREAR' },
      { label: 'Usuarios', description: 'Usuarios y asignación de roles', icon: 'users', route: '/usuarios', modulo: 'USUARIOS' },
      { label: 'Roles', description: 'Roles y permisos por módulo', icon: 'tag', route: '/roles', modulo: 'ROLES' },
      { label: 'Métodos de pago', description: 'Formas de cobro disponibles en el POS', icon: 'credit-card', route: '/metodos-pago', modulo: 'METODOS_PAGO' },
      { label: 'Dispositivos', description: 'Impresora, cajón monedero y lector de código de barras', icon: 'printer', route: '/configuracion/dispositivos', modulo: 'CAJA' },
      { label: 'Negocios', description: 'Gestión de negocios de la plataforma', icon: 'store', route: '/negocios', modulo: 'NEGOCIOS' },
    ],
  },
];
