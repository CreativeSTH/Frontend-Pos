export interface Sucursal {
  id: string;
  negocioId: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  /** 0/undefined = sin meta definida — no se evalúa la alerta de meta no alcanzada. */
  metaVentasDiaria?: number;
  activo: boolean;
  tipoComprobanteDefecto: 'RECIBO' | 'FACTURA';
  plantillaReciboDefectoId?: string;
  plantillaFacturaDefectoId?: string;
  /** Bodega con la que esta sucursal vende por defecto — ver `BodegasService.create` en el backend. */
  bodegaOperativaId?: string;
}
