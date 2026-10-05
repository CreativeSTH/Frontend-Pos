export type TipoDocumentoEmpleado = 'CC' | 'CE' | 'PPT' | 'PASAPORTE';
export type OrigenMarca = 'PIN' | 'MANUAL';

export interface Empleado {
  id: string;
  nombre: string;
  tipoDocumento: TipoDocumentoEmpleado;
  numeroDocumento: string;
  cargo: string | null;
  sucursalId: string | null;
  usuarioId: string | null;
  /** numeric de Postgres: puede llegar como string. */
  salarioMensual: number | string;
  aplicaHorasExtra: boolean;
  activo: boolean;
}

export interface EmpleadoPayload {
  nombre: string;
  tipoDocumento: TipoDocumentoEmpleado;
  numeroDocumento: string;
  cargo?: string | null;
  sucursalId?: string | null;
  usuarioId?: string | null;
  salarioMensual: number;
  aplicaHorasExtra?: boolean;
  /** Solo al crear. */
  pin?: string;
}

export interface TurnoProgramado {
  id: string;
  empleadoId: string;
  sucursalId: string;
  /** 'YYYY-MM-DD' en hora Colombia. */
  fecha: string;
  /** 'HH:MM:SS' */
  horaInicio: string;
  horaFin: string;
  nota: string | null;
  empleado?: { id: string; nombre: string };
}

export interface TurnoPayload {
  empleadoId: string;
  sucursalId: string;
  fecha: string;
  /** 'HH:MM' */
  horaInicio: string;
  horaFin: string;
  nota?: string | null;
}

export interface Jornada {
  id: string;
  empleadoId: string;
  sucursalId: string;
  entrada: string;
  salida: string | null;
  origenEntrada: OrigenMarca;
  origenSalida: OrigenMarca | null;
  sinSalida: boolean;
  corregidaPor: string | null;
  motivoCorreccion: string | null;
  empleado?: { id: string; nombre: string };
  sucursal?: { id: string; nombre: string };
}

export interface AlertaAsistencia {
  tipo: 'TARDE' | 'AUSENTE' | 'SIN_SALIDA';
  empleadoId: string;
  fecha: string;
  jornadaId?: string;
  turnoId?: string;
  minutos?: number;
}

export interface ListadoAsistencia {
  jornadas: Jornada[];
  turnos: TurnoProgramado[];
  alertas: AlertaAsistencia[];
}

export interface FiltrosAsistencia {
  desde: string;
  hasta: string;
  empleadoId?: string;
  sucursalId?: string;
}

export interface ResultadoMarca {
  tipo: 'ENTRADA' | 'SALIDA';
  empleado: { id: string; nombre: string };
  momento: string;
  duracionMinutos?: number;
}

export interface CrearJornadaPayload {
  empleadoId: string;
  sucursalId: string;
  /** ISO 8601 */
  entrada: string;
  salida?: string;
  motivo: string;
}

export interface CorregirJornadaPayload {
  entrada?: string;
  salida?: string;
  motivo: string;
}

export const TIPOS_DOCUMENTO_EMPLEADO: { valor: TipoDocumentoEmpleado; etiqueta: string }[] = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PPT', etiqueta: 'Permiso por protección temporal' },
  { valor: 'PASAPORTE', etiqueta: 'Pasaporte' },
];

export type TipoHora =
  | 'ORDINARIA_DIURNA'
  | 'ORDINARIA_NOCTURNA'
  | 'ORDINARIA_DIURNA_DOMINICAL'
  | 'ORDINARIA_NOCTURNA_DOMINICAL'
  | 'EXTRA_DIURNA'
  | 'EXTRA_NOCTURNA'
  | 'EXTRA_DIURNA_DOMINICAL'
  | 'EXTRA_NOCTURNA_DOMINICAL';

/** Orden de las columnas del reporte. La ordinaria diurna no se paga aparte: ya está en el salario. */
export const ETIQUETA_TIPO_HORA: Record<TipoHora, string> = {
  ORDINARIA_DIURNA: 'Ordinaria diurna',
  ORDINARIA_NOCTURNA: 'Recargo nocturno',
  ORDINARIA_DIURNA_DOMINICAL: 'Dominical o festivo diurno',
  ORDINARIA_NOCTURNA_DOMINICAL: 'Dominical o festivo nocturno',
  EXTRA_DIURNA: 'Extra diurna',
  EXTRA_NOCTURNA: 'Extra nocturna',
  EXTRA_DIURNA_DOMINICAL: 'Extra diurna dominical o festiva',
  EXTRA_NOCTURNA_DOMINICAL: 'Extra nocturna dominical o festiva',
};

export interface TramoReporte {
  fecha: string;
  inicio: string;
  fin: string;
  minutos: number;
  tipo: TipoHora;
  porcentaje: number;
  valor: number;
}

export interface AlertaRecargos {
  tipo: 'EXTRA_DIA' | 'EXTRA_SEMANA';
  fecha: string;
  minutos: number;
}

export interface RecargosEmpleado {
  empleado: {
    id: string;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
    salarioMensual: number;
    aplicaHorasExtra: boolean;
  };
  porTipo: Record<TipoHora, { minutos: number; valor: number }>;
  total: number;
  tramos: TramoReporte[];
  alertas: AlertaRecargos[];
}

export interface ReporteRecargos {
  desde: string;
  hasta: string;
  empleados: RecargosEmpleado[];
  alertasAsistencia: AlertaAsistencia[];
  totalGeneral: number;
  nota: string;
}
