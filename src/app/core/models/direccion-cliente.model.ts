export interface DireccionCliente {
  id: string;
  negocioId: string;
  clienteId: string;
  etiqueta?: string;
  direccionLinea1: string;
  direccionLinea2?: string;
  barrio?: string;
  puntoReferencia?: string;
  telefonoContacto?: string;
  predeterminada: boolean;
  activo: boolean;
  createdAt: string;
}

export interface CreateDireccionClientePayload {
  etiqueta?: string;
  direccionLinea1: string;
  direccionLinea2?: string;
  barrio?: string;
  puntoReferencia?: string;
  telefonoContacto?: string;
  predeterminada?: boolean;
}
