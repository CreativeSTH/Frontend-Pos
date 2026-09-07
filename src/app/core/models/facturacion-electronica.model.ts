export type EstadoHabilitacion =
  | 'DATOS_NEGOCIO'
  | 'ESPERANDO_TRAMITE_DIAN'
  | 'RESOLUCION_CARGADA'
  | 'TESTSET_EN_CURSO'
  | 'HABILITADO'
  | 'ERROR';

export interface HabilitacionFacturacionElectronica {
  id: string;
  negocioId: string;
  estado: EstadoHabilitacion;
  razonSocial?: string;
  direccion?: string;
  ciudad?: string;
  ciudadCodigo?: string;
  departamentoCodigo?: string;
  useAlegraCertificate: boolean;
  resolucionNumero?: string;
  governmentTestSetId?: string;
  errorMensaje?: string;
  ambiente: 'SANDBOX' | 'PRODUCCION';
  esHabilitacionDePrueba: boolean;
}

export interface DatosNegocioPayload {
  razonSocial: string;
  /** Sin dígito de verificación ni puntos/guiones — obligatorio para facturar, aunque en /mi-negocio sea opcional. */
  nit: string;
  /** Alegra lo exige como dato de la compañía — obligatorio para facturar. */
  email: string;
  direccion: string;
  /** Nombre del municipio, solo para mostrar — la validación real la hace ciudadCodigo. */
  ciudadNombre: string;
  /** Código DIVIPOLA del municipio (5 dígitos) — Alegra lo valida contra un enum estricto, no nombres libres. */
  ciudadCodigo: string;
  /** Código DIVIPOLA del departamento (2 dígitos), derivado del municipio elegido. */
  departamentoCodigo: string;
  useAlegraCertificate: boolean;
  certificadoPfxBase64?: string;
  certificadoPassword?: string;
}

export interface ResolucionPayload {
  numero: string;
  prefijo: string;
  fechaInicio: string;
  fechaFin: string;
  rangoDesde: number;
  rangoHasta: number;
  technicalKey: string;
  /** TestSetId emitido por la DIAN en su portal de Habilitación (Paso 2 del trámite) — no lo genera Alegra. */
  governmentTestSetId: string;
}

export type EstadoDocumentoElectronico = 'PENDIENTE' | 'ACEPTADO' | 'ACEPTADO_CON_OBSERVACIONES' | 'RECHAZADO' | 'ERROR';

export interface DocumentoElectronico {
  id: string;
  ventaId: string;
  tipo: 'DEE_POS' | 'FACTURA';
  estado: EstadoDocumentoElectronico;
  cufe?: string;
  cude?: string;
  errorMensaje?: string;
}
