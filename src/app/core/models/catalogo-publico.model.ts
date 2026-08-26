import { PlantillaTienda } from './tienda-online.model';

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
  plantilla: PlantillaTienda;
  logoUrl: string | null;
  banners: string[];
  terminos: string | null;
  tratamientoDatos: string | null;
  politicaEnvios: string | null;
}
