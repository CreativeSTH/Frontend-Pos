import { AccionPermiso, ModuloPermiso } from './auth.model';

export interface ConfiguracionCard {
  label: string;
  description: string;
  icon: string;
  route: string;
  modulo: ModuloPermiso;
  /** Default 'VER' — algunas cards (el asistente) necesitan un permiso más fuerte para que valga la pena mostrarlas. */
  accion?: AccionPermiso;
  /** Si se declara, la card además se oculta cuando el paquete contratado del negocio no incluye este feature (ej. Facturación DIAN). */
  featureRequerida?: 'facturacionDianHabilitada' | 'tiendaOnlineHabilitada';
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
      { label: 'Gráficos', description: 'Crear y administrar gráficos personalizados', icon: 'activity', route: '/graficos', modulo: 'GRAFICOS' },
      { label: 'Alertas', description: 'Notificaciones y reglas de alerta', icon: 'bell', route: '/alertas', modulo: 'ALERTAS' },
    ],
  },
  {
    titulo: 'Negocio',
    items: [
      { label: 'Datos del negocio', description: 'Nombre, NIT, dirección y contacto', icon: 'settings', route: '/mi-negocio', modulo: 'NEGOCIO' },
      { label: 'Facturación electrónica DIAN', description: 'Habilitación con Alegra y estado de tus documentos', icon: 'file-text', route: '/configuracion/facturacion-electronica', modulo: 'FACTURACION_ELECTRONICA_DIAN', featureRequerida: 'facturacionDianHabilitada' },
      { label: 'Sucursales', description: 'Sucursales y metas de venta', icon: 'store', route: '/sucursales', modulo: 'SUCURSALES' },
      { label: 'Asistente de configuración', description: 'Guía paso a paso para dejar una sucursal lista: bodega y productos', icon: 'layers', route: '/asistente', modulo: 'SUCURSALES', accion: 'CREAR' },
      { label: 'Usuarios', description: 'Usuarios y asignación de roles', icon: 'users', route: '/usuarios', modulo: 'USUARIOS' },
      { label: 'Roles', description: 'Roles y permisos por módulo', icon: 'tag', route: '/roles', modulo: 'ROLES' },
      { label: 'Métodos de pago', description: 'Formas de cobro disponibles en el POS', icon: 'credit-card', route: '/metodos-pago', modulo: 'METODOS_PAGO' },
      { label: 'Mi plan', description: 'Tu paquete, próximo cobro, y cancelar si hace falta', icon: 'credit-card', route: '/configuracion/mi-plan', modulo: 'NEGOCIO' },
      { label: 'Facturación', description: 'Formatos de recibo y factura', icon: 'file-text', route: '/configuracion/facturacion', modulo: 'FACTURACION' },
      { label: 'Cupones y descuentos', description: 'Cupones de código y promociones automáticas por sucursal, categoría o producto', icon: 'tag', route: '/configuracion/cupones', modulo: 'CUPONES' },
      { label: 'Dispositivos', description: 'Impresora, cajón monedero y lector de código de barras', icon: 'printer', route: '/configuracion/dispositivos', modulo: 'CAJA' },
      { label: 'Pagos con Wompi', description: 'Credenciales y activación de la pasarela de pago Wompi', icon: 'credit-card', route: '/configuracion/pagos-wompi', modulo: 'PAGOS', accion: 'EDITAR' },
      { label: 'Tienda online', description: 'Bodega y activación de tu catálogo público', icon: 'store', route: '/configuracion/tienda-online', modulo: 'TIENDA_ONLINE', accion: 'EDITAR' },
      { label: 'Paquetes', description: 'Catálogo de planes que se pueden asignar a un negocio', icon: 'layers', route: '/paquetes', modulo: 'PAQUETES' },
      { label: 'Negocios', description: 'Gestión de negocios de la plataforma', icon: 'store', route: '/negocios', modulo: 'NEGOCIOS' },
    ],
  },
];
