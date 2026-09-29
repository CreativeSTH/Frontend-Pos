import { DomicilioVentaPayload } from './domicilio.model';
import type { EstadoDocumentoElectronico } from './facturacion-electronica.model';

export interface Venta {
  id: string;
  negocioId: string;
  sucursalId: string;
  bodegaId: string;
  turnoId: string;
  clienteId?: string;
  nombreCliente: string;
  tipoVenta: 'CONTADO' | 'CREDITO';
  estado: string;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
  costoTotal: number;
  margenBruto: number;
  canceladaPor?: string;
  motivoCancelacion?: string;
  fechaCancelacion?: string;
  numeroComprobante?: string;
  tipoComprobanteEmitido?: 'RECIBO' | 'FACTURA' | 'FACTURA_ELECTRONICA';
  cuponId?: string;
  descuentoCupon: number;
  items: VentaItem[];
  pagos: VentaPago[];
  createdAt: string;
  /** Factura electrónica de la venta (o null si no generó una) — la adjunta `GET /ventas`. */
  documentoElectronico?: { id: string; estado: EstadoDocumentoElectronico } | null;
}

export interface VentaItem {
  id: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  costoUnitario: number;
}

export interface VentaPago {
  id: string;
  /** Nombre del método de pago tal cual estaba en el catálogo del negocio al momento de la venta. */
  metodoPago: string;
  monto: number;
  referencia?: string;
}

export interface CreateVentaPayload {
  sucursalId: string;
  bodegaId: string;
  clienteId?: string;
  nombreCliente?: string;
  tipoVenta?: 'CONTADO' | 'CREDITO';
  /** Ignorado por el backend desde la unificación de comprobantes: lo decide la política de facturación. */
  tipoComprobante?: 'RECIBO' | 'FACTURA';
  numeroCuotas?: number;
  fechaPrimerPago?: string;
  omitirValidacionCredito?: boolean;
  descuentoVenta?: number;
  pinAutorizacionDescuento?: string;
  cuponCodigo?: string;
  items: Array<{ productoId: string; cantidad: number; descuento?: number }>;
  pagos?: Array<{ metodoPago: string; monto: number; referencia?: string }>;
  domicilio?: DomicilioVentaPayload;
}
