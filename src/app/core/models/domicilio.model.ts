export type EstadoDomicilio = 'NUEVO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export interface Domicilio {
  id: string;
  negocioId: string;
  sucursalId: string;
  ventaId: string;
  clienteId?: string;
  nombreCliente: string;
  direccionClienteId?: string;
  direccionTexto: string;
  puntoReferencia?: string;
  telefonoContacto?: string;
  estado: EstadoDomicilio;
  domiciliarioNombre?: string;
  costoDomicilio?: number;
  motivoCancelacion?: string;
  fechaEnCamino?: string;
  fechaEntregado?: string;
  fechaCancelado?: string;
  creadoPor: string;
  createdAt: string;
}

/** Va anidado en CreateVentaPayload — un domicilio siempre nace de una venta. */
export interface DomicilioVentaPayload {
  direccionClienteId?: string;
  direccionNueva?: {
    etiqueta?: string;
    direccionLinea1: string;
    direccionLinea2?: string;
    barrio?: string;
    puntoReferencia?: string;
    telefonoContacto?: string;
    predeterminada?: boolean;
  };
  costoDomicilio?: number;
}
