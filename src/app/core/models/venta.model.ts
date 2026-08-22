import { DomicilioVentaPayload } from './domicilio.model';

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
  items: VentaItem[];
  pagos: VentaPago[];
  createdAt: string;
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
  metodoPago: MetodoPago;
  monto: number;
  referencia?: string;
}

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';

export interface CreateVentaPayload {
  sucursalId: string;
  bodegaId: string;
  clienteId?: string;
  nombreCliente?: string;
  tipoVenta?: 'CONTADO' | 'CREDITO';
  numeroCuotas?: number;
  fechaPrimerPago?: string;
  omitirValidacionCredito?: boolean;
  descuentoVenta?: number;
  items: Array<{ productoId: string; cantidad: number; descuento?: number }>;
  pagos?: Array<{ metodoPago: MetodoPago; monto: number; referencia?: string }>;
  domicilio?: DomicilioVentaPayload;
}
