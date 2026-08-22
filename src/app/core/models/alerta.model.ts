export type TipoAlerta =
  | 'STOCK_BAJO'
  | 'CUOTA_POR_VENCER'
  | 'CUOTA_VENCIDA'
  | 'CLIENTE_LIMITE_CREDITO'
  | 'VENTA_EN_MORA';

export type SeveridadAlerta = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface Alerta {
  id: string;
  negocioId: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  referenciaId: string;
  mensaje: string;
  leida: boolean;
  resuelta: boolean;
  createdAt: string;
}

export interface ResumenAlertas {
  total: number;
  porSeveridad: Record<SeveridadAlerta, number>;
  activas: number;
  leidas: number;
  resueltas: number;
}
