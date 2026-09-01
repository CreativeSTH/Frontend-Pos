export type TipoAlerta =
  | 'STOCK_BAJO'
  | 'PRODUCTO_AGOTADO'
  | 'CUOTA_POR_VENCER'
  | 'CUOTA_VENCIDA'
  | 'CLIENTE_LIMITE_CREDITO'
  | 'VENTA_EN_MORA'
  | 'META_VENTAS_NO_ALCANZADA'
  | 'PERSONALIZADA'
  | 'REGLA'
  | 'SUSCRIPCION_PROXIMO_COBRO'
  | 'SUSCRIPCION_COBRO_FALLIDO'
  | 'FACTURACION_DIAN_VENCIDA';

export type SeveridadAlerta = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface Alerta {
  id: string;
  negocioId: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  referenciaId?: string;
  productoId?: string;
  reglaId?: string;
  mensaje: string;
  leida: boolean;
  resuelta: boolean;
  activa: boolean;
  createdAt: string;
}

export interface ResumenAlertas {
  total: number;
  porSeveridad: Record<SeveridadAlerta, number>;
  activas: number;
  leidas: number;
  resueltas: number;
}

export interface CreateAlertaPayload {
  severidad: SeveridadAlerta;
  mensaje: string;
  activa?: boolean;
}

/** Condiciones disponibles para una `ReglaAlerta` — `valor` se interpreta en horas o días según cuál. */
export type TipoCondicionAlerta =
  | 'LISTA_PEDIDOS_SIN_RESOLVER'
  | 'TURNO_ABIERTO_MUCHO_TIEMPO'
  | 'DESCUADRE_SIN_PAGAR';

export interface ReglaAlerta {
  id: string;
  negocioId: string;
  nombre: string;
  tipoCondicion: TipoCondicionAlerta;
  parametros: { valor: number };
  severidad: SeveridadAlerta;
  activa: boolean;
  createdAt: string;
}

export interface CreateReglaAlertaPayload {
  nombre: string;
  tipoCondicion: TipoCondicionAlerta;
  valor: number;
  severidad: SeveridadAlerta;
  activa?: boolean;
}
