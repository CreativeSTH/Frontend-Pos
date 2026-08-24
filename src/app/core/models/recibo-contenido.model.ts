import { DatosDianPlantilla } from './plantilla-comprobante.model';
import { TipoComprobante } from './plantilla-comprobante.model';

export interface ItemComprobante {
  nombre: string;
  cantidad: number;
  subtotal: number;
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
export interface ReciboContenido {
  tipo: TipoComprobante;
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
}
