import { Categoria } from './categoria.model';

export type TipoImpuesto = 'GRAVADO' | 'EXCLUIDO' | 'EXENTO';

export interface Producto {
  id: string;
  negocioId: string;
  categorias: Categoria[];
  marcaId?: string;
  lineaId?: string;
  nombre: string;
  descripcion?: string;
  sku?: string;
  codigoBarras?: string;
  unidadMedida: string;
  precioVenta: number;
  costo: number;
  tipoImpuesto: TipoImpuesto;
  porcentajeImpuesto: number;
  imagenUrl?: string;
  activo: boolean;
  createdAt: string;
}

export interface StockInicialPayload {
  bodegaId: string;
  cantidad: number;
}

export interface ProveedorInicialPayload {
  proveedorId?: string;
  proveedorNuevo?: { nombre: string };
  costo: number;
  referencia?: string;
}

export interface CreateProductoPayload {
  nombre: string;
  descripcion?: string;
  sku?: string;
  codigoBarras?: string;
  categoriaIds?: string[];
  marcaId?: string;
  lineaId?: string;
  unidadMedida: string;
  precioVenta: number;
  costo: number;
  tipoImpuesto?: TipoImpuesto;
  porcentajeImpuesto?: number;
  stockInicial?: StockInicialPayload[];
  proveedores?: ProveedorInicialPayload[];
}
