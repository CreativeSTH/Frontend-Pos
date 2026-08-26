export interface ProductoCatalogo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioVenta: number;
  porcentajeImpuesto: number;
  imagenUrl: string | null;
}

export interface CatalogoTienda {
  activa: boolean;
  productos: ProductoCatalogo[];
}
