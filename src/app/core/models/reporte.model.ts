export interface ReporteVentas {
  desde: string;
  hasta: string;
  totalVentas: number;
  totalIngresos: number;
  totalDescuentos: number;
  ticketPromedio: number;
  ventasContado: number;
  totalContado: number;
  ventasCredito: number;
  totalCredito: number;
  porDia: { fecha: string; cantidad: number; total: number }[];
  porMetodoPago: { metodoPago: string; total: number }[];
}

export interface ProductoPorMargen {
  productoId: string;
  nombreProducto: string;
  cantidadVendida: number;
  ingreso: number;
  margen: number;
}

export interface ReporteMargenes {
  desde: string;
  hasta: string;
  margenBrutoTotal: number;
  costoTotal: number;
  ingresoTotal: number;
  porcentajeMargen: number;
  topProductos: ProductoPorMargen[];
}

export interface CierreCajaResumen {
  id: string;
  sucursalNombre: string;
  fechaApertura: string;
  fechaCierre: string;
  usuarioAperturaNombre: string;
  usuarioCierreNombre: string;
  montoInicial: number;
  montoContadoCierre: number | null;
  montoEsperadoCierre: number | null;
  diferencia: number | null;
  descuadrePagado: boolean;
}

export interface ReporteCierresCaja {
  desde: string;
  hasta: string;
  totalTurnos: number;
  totalDiferencia: number;
  turnosConDescuadre: number;
  turnos: CierreCajaResumen[];
}
