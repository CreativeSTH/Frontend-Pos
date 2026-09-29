import { BadgeTone } from '../../shared/ui/atoms/badge/badge';
import { EstadoDocumentoElectronico } from '../../core/models/facturacion-electronica.model';

/** Una sola fuente de etiquetas/tonos del estado DIAN — la usan la lista de facturas, su detalle y Ventas. */
const ETIQUETAS: Record<EstadoDocumentoElectronico, string> = {
  PENDIENTE: 'Pendiente DIAN',
  ACEPTADO: 'Aceptada',
  ACEPTADO_CON_OBSERVACIONES: 'Aceptada con observaciones',
  RECHAZADO: 'Rechazada',
  ERROR: 'Pendiente DIAN',
};

const TONOS: Record<EstadoDocumentoElectronico, BadgeTone> = {
  PENDIENTE: 'info',
  ACEPTADO: 'success',
  ACEPTADO_CON_OBSERVACIONES: 'warning',
  RECHAZADO: 'danger',
  ERROR: 'info',
};

export function etiquetaEstadoDocumento(estado: EstadoDocumentoElectronico): string {
  return ETIQUETAS[estado] ?? estado;
}

export function tonoEstadoDocumento(estado: EstadoDocumentoElectronico): BadgeTone {
  return TONOS[estado] ?? 'neutral';
}
