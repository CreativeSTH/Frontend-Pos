export interface Proveedor {
  id: string;
  negocioId: string;
  nombre: string;
  nit?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rutNumero?: string;
  rutDocumentoUrl?: string;
  camaraComercioNumero?: string;
  camaraComercioUrl?: string;
  certificacionBancariaInfo?: string;
  certificacionBancariaUrl?: string;
  activo: boolean;
  createdAt: string;
}

export interface CreateProveedorPayload {
  nombre: string;
  nit?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rutNumero?: string;
  camaraComercioNumero?: string;
  certificacionBancariaInfo?: string;
}

export interface ProveedorDocumentos {
  rutDocumento?: File | null;
  camaraComercioDocumento?: File | null;
  certificacionBancariaDocumento?: File | null;
}

/** Vínculo producto↔proveedor con el costo pactado. */
export interface ProductoProveedor {
  id: string;
  negocioId: string;
  productoId: string;
  proveedorId: string;
  proveedor?: Proveedor;
  costo: number;
  referencia?: string;
  activo: boolean;
  createdAt: string;
}

export interface VincularProveedorPayload {
  proveedorId?: string;
  proveedorNuevo?: { nombre: string };
  costo: number;
  referencia?: string;
}
