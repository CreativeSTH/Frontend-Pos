import type { EstadoDocumentoElectronico } from './facturacion-electronica.model';

/** Espejo de `TipoComprobanteListado` del backend (`GET /facturacion/comprobantes`). */
export type TipoComprobanteListado = 'FACTURA_ELECTRONICA' | 'RECIBO' | 'FACTURA' | 'RECIBO_CAJA';

export interface FilaComprobante {
  tipo: TipoComprobanteListado;
  numero: string | null;
  fecha: string;
  cliente: string | null;
  total: number;
  estadoDian: EstadoDocumentoElectronico | null;
  ambiente: string | null;
  estadoVenta: string;
  ventaId: string;
  documentoId: string | null;
  abonoId: string | null;
}

export interface ResumenComprobantes {
  porTipo: Record<TipoComprobanteListado, number>;
  dian: { aceptados: number; pendientes: number; rechazados: number };
}

export interface ListadoComprobantes {
  items: FilaComprobante[];
  total: number;
  pagina: number;
  porPagina: number;
  resumen: ResumenComprobantes;
}

export interface FiltrosComprobantes {
  tipo?: TipoComprobanteListado;
  estadoDian?: EstadoDocumentoElectronico;
  desde?: string;
  hasta?: string;
  q?: string;
  pagina?: number;
  porPagina?: number;
}

/** `GET /politica-facturacion/tope-uvt` — `aplica: false` para obligados o perfil sin declarar. */
export interface MedicionTopeUvt {
  aplica: boolean;
  anio: number | null;
  ingresos: number;
  tope: number | null;
  porcentaje: number;
}
