export type EstadoTraslado = 'EN_TRANSITO' | 'RECIBIDO' | 'CANCELADO';

export interface TrasladoItem {
  id: string;
  productoId: string;
  /** numeric de Postgres: puede llegar como string. */
  cantidadEnviada: number | string;
  cantidadRecibida: number | string | null;
  producto?: { id: string; nombre: string };
}

export interface Traslado {
  id: string;
  consecutivo: number;
  bodegaOrigenId: string;
  bodegaDestinoId: string;
  bodegaOrigen?: { id: string; nombre: string };
  bodegaDestino?: { id: string; nombre: string };
  estado: EstadoTraslado;
  nota: string | null;
  enviadoEn: string;
  recibidoEn: string | null;
  canceladoEn: string | null;
  items: TrasladoItem[];
  /** Solo en el detalle. */
  enviadoPorNombre?: string | null;
  recibidoPorNombre?: string | null;
  canceladoPorNombre?: string | null;
}

export interface CrearTrasladoPayload {
  bodegaOrigenId: string;
  bodegaDestinoId: string;
  items: { productoId: string; cantidad: number }[];
  nota?: string;
}

export interface RecibirTrasladoPayload {
  items: { productoId: string; cantidadRecibida: number }[];
}

export interface FiltrosTraslados {
  estado?: EstadoTraslado;
  bodegaId?: string;
  desde?: string;
  hasta?: string;
}

export function etiquetaTraslado(consecutivo: number): string {
  return `TR-${consecutivo}`;
}

export const ETIQUETA_ESTADO_TRASLADO: Record<EstadoTraslado, string> = {
  EN_TRANSITO: 'En tránsito',
  RECIBIDO: 'Recibido',
  CANCELADO: 'Cancelado',
};
