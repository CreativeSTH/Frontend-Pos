export interface ClienteTienda {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
}

export interface ClienteTiendaSesion {
  accessToken: string;
  cliente: ClienteTienda;
}

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  porcentajeImpuesto: number;
  cantidad: number;
  imagenUrl: string | null;
}
