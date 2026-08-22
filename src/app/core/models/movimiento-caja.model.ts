export type TipoMovimientoCaja = 'VENTA' | 'INGRESO' | 'EGRESO' | 'RETIRO';

export interface MovimientoCaja {
  id: string;
  turnoId: string;
  tipo: TipoMovimientoCaja;
  monto: number;
  concepto?: string;
  metodoPago?: string;
  ventaId?: string;
  createdAt: string;
}
