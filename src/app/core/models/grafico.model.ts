export type TipoGrafico = 'LINEA' | 'BARRA' | 'BARRA_APILADA' | 'AREA' | 'PASTEL' | 'DONA';

export type FuenteDatoGrafico =
  | 'VENTAS_TOTAL'
  | 'VENTAS_CONTADO'
  | 'VENTAS_CREDITO'
  | 'INGRESOS'
  | 'EGRESOS'
  | 'MARGEN_BRUTO'
  | 'METODOS_PAGO'
  | 'PRODUCTOS_TOP'
  | 'CIERRES_CAJA_DIFERENCIA';

export interface FuenteDatoCatalogoItem {
  valor: FuenteDatoGrafico;
  etiqueta: string;
  tipoEje: 'FECHA' | 'CATEGORIA';
}

export interface SerieGrafico {
  fuenteDato: FuenteDatoGrafico;
  etiqueta: string;
  sucursalId?: string;
  color?: string;
}

export interface RangoFechaGrafico {
  modo: 'FIJO' | 'RELATIVO';
  /** ISO date, solo si modo=FIJO. */
  desde?: string;
  /** ISO date, solo si modo=FIJO. */
  hasta?: string;
  /** Solo si modo=RELATIVO. */
  diasRelativos?: number;
}

export interface CompararGrafico {
  activo: boolean;
  tipo: 'PERIODO_ANTERIOR' | 'MISMO_PERIODO_ANIO_ANTERIOR';
}

export interface OpcionesGrafico {
  mostrarLeyenda?: boolean;
  apilado?: boolean;
}

export interface ConfiguracionGrafico {
  series: SerieGrafico[];
  rangoFecha: RangoFechaGrafico;
  agrupacion: 'DIA' | 'SEMANA' | 'MES';
  comparar?: CompararGrafico;
  opciones?: OpcionesGrafico;
}

export interface GraficoConfigurado {
  id: string;
  nombre: string;
  tipo: TipoGrafico;
  configuracion: ConfiguracionGrafico;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatoGrafico {
  x: string;
  y: number;
}

export interface SerieResultado {
  etiqueta: string;
  datos: DatoGrafico[];
}

export type PaginaLayoutGraficos = 'DASHBOARD' | 'REPORTES';

export interface WidgetLayoutGrafico {
  id: string;
  graficoId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutGraficos {
  id: string;
  pagina: PaginaLayoutGraficos;
  widgets: WidgetLayoutGrafico[];
}
