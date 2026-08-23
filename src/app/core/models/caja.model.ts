export interface ArqueoMetodoPago {
  metodoPago: string;
  montoEsperado: number;
  montoContado: number;
  diferencia: number;
}

export interface UsuarioTurnoResumen {
  id: string;
  nombre: string;
}

export interface TurnoCaja {
  id: string;
  negocioId: string;
  sucursalId: string;
  usuarioAperturaId: string;
  usuarioApertura?: UsuarioTurnoResumen;
  fechaApertura: string;
  montoInicial: number;
  usuarioCierreId?: string;
  usuarioCierre?: UsuarioTurnoResumen;
  fechaCierre?: string;
  montoContadoCierre?: number;
  montoEsperadoCierre?: number;
  diferencia?: number;
  arqueoMetodos?: ArqueoMetodoPago[];
  descuadrePagado: boolean;
  montoPagadoDescuadre?: number;
  fechaPagoDescuadre?: string;
  estado: 'ABIERTO' | 'CERRADO';
}

export interface ResumenTurno {
  montoInicial: number;
  ventasEfectivo: number;
  /** Nombre del método marcado como efectivo en el catálogo del negocio — puede no haber ninguno. */
  nombreMetodoEfectivo?: string;
  ventasDigitales: { metodoPago: string; total: number }[];
  totalVentasDigitales: number;
  ingresos: number;
  egresos: number;
  retiros: number;
  totalVentas: number;
  efectivoEsperado: number;
}
