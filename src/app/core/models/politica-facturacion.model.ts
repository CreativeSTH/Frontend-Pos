export type ModoFacturacion = 'ELECTRONICA' | 'RECIBO' | 'GRACIA' | 'BLOQUEADO' | 'SIN_DECLARAR';
export type TipoPersona = 'NATURAL' | 'JURIDICA';
export type ResponsabilidadIva = 'RESPONSABLE' | 'NO_RESPONSABLE' | 'REGIMEN_SIMPLE';

export interface PerfilFiscal {
  tipoPersona: TipoPersona;
  responsabilidadIva: ResponsabilidadIva;
  declaradoEn: string;
}

/** Espejo de `EstadoFacturacion` del backend (`GET /politica-facturacion/estado`). */
export interface EstadoFacturacion {
  modo: ModoFacturacion;
  obligado: boolean | null;
  diasGraciaRestantes: number | null;
  /** 'YYYY-MM-DD' — último día en que todavía se puede cobrar sin facturación electrónica. */
  fechaLimiteGracia: string | null;
  perfil: PerfilFiscal | null;
}

export interface DeclaracionPerfilFiscal {
  tipoPersona: TipoPersona;
  responsabilidadIva: ResponsabilidadIva;
  aceptaDeclaracion: true;
}
