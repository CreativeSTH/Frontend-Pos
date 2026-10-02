export type FormaReembolso = 'EFECTIVO' | 'DESCUENTO_DEUDA' | 'SALDO_A_FAVOR';

export const ETIQUETA_FORMA: Record<FormaReembolso, string> = {
  EFECTIVO: 'Efectivo',
  DESCUENTO_DEUDA: 'Descuento a la deuda',
  SALDO_A_FAVOR: 'Saldo a favor',
};

/** Medio de pago reservado del backend: descuenta el saldo a favor del cliente (no entra a la caja). */
export const METODO_SALDO_A_FAVOR = 'Saldo a favor';

export interface LineaDevolvible {
  ventaItemId: string;
  productoId: string;
  nombreProducto: string;
  vendida: number;
  devuelta: number;
  disponible: number;
  precioUnitario: number;
  /** Lo que se reembolsa por unidad (con descuentos e IVA). */
  netoPorUnidad: number;
}

/** `GET /ventas/:id/devolvible` */
export interface Devolvible {
  ventaId: string;
  numeroVenta: string | null;
  lineas: LineaDevolvible[];
  saldoDeudaVenta: number;
  tieneCliente: boolean;
  /** Efectivo esperado del turno abierto de la sucursal; null si no hay turno abierto. */
  efectivoDisponible: number | null;
  bloqueo: string | null;
}

export interface CrearDevolucionBody {
  ventaId: string;
  motivo: string;
  items: { ventaItemId: string; cantidad: number; vuelveAInventario: boolean; motivoBaja?: string }[];
  reembolsos: { forma: FormaReembolso; monto: number }[];
  pinAutorizacion?: string;
}

export interface Devolucion {
  id: string;
  ventaId: string;
  sucursalId: string;
  numeroCompleto: string;
  motivo: string;
  total: number;
  createdAt: string;
  reembolsos: { forma: FormaReembolso; monto: number }[];
}
