/** Contingencia de facturación (fase 6a) — espejo de `ContingenciaService` del backend. */
export type OrigenContingencia = 'AUTOMATICA' | 'MANUAL';

export interface PeriodoContingencia {
  id: string;
  inicio: string;
  fin: string | null;
  origen: OrigenContingencia;
  motivo: string;
  avisoInicioEn: string | null;
  avisoFinEn: string | null;
}

export interface ResolucionContingencia {
  numero: string;
  prefijo: string;
  fechaInicio: string;
  fechaFin: string;
  rangoDesde: number;
  rangoHasta: number;
  siguienteNumero: number;
}

export interface EstadoContingencia {
  resolucion: ResolucionContingencia | null;
  activa: PeriodoContingencia | null;
  /** Últimos 10, del más reciente al más viejo. */
  periodos: PeriodoContingencia[];
  /** Facturas de contingencia todavía sin aceptar por la DIAN. */
  pendientes: number;
  /** Vencimiento de 48 h más próximo; null si no hay pendientes de un período cerrado. */
  venceEl: string | null;
}

export type ResolucionContingenciaPayload = Omit<ResolucionContingencia, 'siguienteNumero'>;
