export type ModuloPermiso =
  | 'NEGOCIOS'
  | 'NEGOCIO'
  | 'SUCURSALES'
  | 'USUARIOS'
  | 'ROLES'
  | 'PRODUCTOS'
  | 'CATEGORIAS'
  | 'MARCAS'
  | 'LINEAS'
  | 'PROVEEDORES'
  | 'BODEGAS'
  | 'INVENTARIO'
  | 'VENTAS'
  | 'CAJA'
  | 'COBROS'
  | 'CLIENTES'
  | 'DOMICILIOS'
  | 'ALERTAS'
  | 'REPORTES'
  | 'METODOS_PAGO'
  | 'GRAFICOS'
  | 'FACTURACION'
  | 'CUPONES'
  | 'PAGOS'
  | 'TIENDA_ONLINE'
  | 'PAQUETES'
  | 'FACTURACION_ELECTRONICA_DIAN';

export type AccionPermiso = 'VER' | 'CREAR' | 'EDITAR' | 'ELIMINAR';

export type RolTier = 'SISTEMA' | 'NEGOCIO';

export interface PermisoResumen {
  modulo: ModuloPermiso;
  accion: AccionPermiso;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rolId: string;
  rolNombre: string;
  rolTier: RolTier;
  negocioId: string | null;
  sucursalId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioSesion;
  permisos: PermisoResumen[];
}
