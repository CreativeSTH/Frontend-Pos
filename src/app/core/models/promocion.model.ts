export type TipoPromocion = 'PROMOCION' | 'CUPON';
export type TipoDescuento = 'PORCENTAJE' | 'MONTO_FIJO';
export type EstadoPromocion = 'PROGRAMADA' | 'ACTIVA' | 'EXPIRADA' | 'AGOTADA' | 'INACTIVA';

export interface RefNombre {
  id: string;
  nombre: string;
}

export interface Promocion {
  id: string;
  tipo: TipoPromocion;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  tipoDescuento: TipoDescuento;
  valor: number;
  montoMinimoCompra?: number;
  fechaInicio?: string;
  fechaFin?: string;
  usoMaximo?: number;
  activo: boolean;
  sucursales: RefNombre[];
  bodegas: RefNombre[];
  categorias: RefNombre[];
  productos: RefNombre[];
  estado: EstadoPromocion;
  usosActuales: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromocionPayload {
  tipo: TipoPromocion;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  tipoDescuento: TipoDescuento;
  valor: number;
  montoMinimoCompra?: number;
  fechaInicio?: string;
  fechaFin?: string;
  usoMaximo?: number;
  activo?: boolean;
  sucursalIds?: string[];
  bodegaIds?: string[];
  categoriaIds?: string[];
  productoIds?: string[];
}

export interface PrecioVigente {
  productoId: string;
  precio: number;
  precioOriginal: number;
  promocionId: string;
  promocionNombre: string;
}

export interface ValidarCuponPayload {
  codigo: string;
  sucursalId: string;
  bodegaId: string;
  items: { productoId: string; cantidad: number; precioUnitario: number }[];
}

export interface ValidarCuponResultado {
  valido: boolean;
  descuento?: number;
  motivo?: string;
}
