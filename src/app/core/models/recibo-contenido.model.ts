import { DatosDianPlantilla } from './plantilla-comprobante.model';
import { TipoComprobante } from './plantilla-comprobante.model';
import type { EstadoDocumentoElectronico } from './facturacion-electronica.model';

/** Comprobante de una venta: `FACTURA_ELECTRONICA` no existe en plantillas/numeraciones, solo en ventas. */
export type TipoComprobanteVenta = TipoComprobante | 'FACTURA_ELECTRONICA';

export interface ItemComprobante {
  nombre: string;
  cantidad: number;
  subtotal: number;
  baseImponible: number;
  impuesto: number;
}

export interface PagoComprobante {
  metodo: string;
  monto: number;
}

/**
 * Contenido ya resuelto (plantilla + datos de la venta) devuelto por
 * `GET /ventas/:id/comprobante` — tanto `PrintAgentService.imprimirTicket()`
 * como el fallback de navegador son renderers puros de este mismo objeto,
 * así los dos dejan de reconstruir el recibo cada uno por su lado.
 */
/** Bloque fiscal de una venta FACTURA_ELECTRONICA — espejo de `ElectronicaComprobante` del backend. */
export interface ElectronicaComprobante {
  estado: EstadoDocumentoElectronico;
  /** 'EN VALIDACIÓN DIAN — REIMPRIMIBLE' | 'RECHAZADA POR LA DIAN — SIN VALIDEZ FISCAL' | 'DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL' | null */
  encabezado: string | null;
  numeroCompleto: string | null;
  fechaEmision: string | null;
  cufe: string | null;
  qrDataUrl: string | null;
  resolucion: string | null;
  emisor: { razonSocial: string; nitConDv: string; direccion: string } | null;
  adquirente: { nombre: string; identificacion: string };
  formaPago: 'Contado' | 'Crédito';
  proveedorTecnologico: string;
}

export interface ReciboContenido {
  tipo: TipoComprobanteVenta;
  negocio: { nombre: string; nit?: string; logoUrl?: string };
  emisor: { nombrePersonaNatural?: string; direccion?: string; telefono?: string };
  numero: string;
  fecha: string;
  cliente: string;
  items: ItemComprobante[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  pagos: PagoComprobante[];
  mensajeCierre?: string;
  terminos?: string;
  dian?: DatosDianPlantilla;
  electronica?: ElectronicaComprobante;
  /** Solo en comprobantes que no son factura electrónica. */
  leyenda?: string;
}
