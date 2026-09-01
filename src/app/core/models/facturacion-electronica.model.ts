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
  useAlegraCertificate: boolean;
  resolucionNumero?: string;
  errorMensaje?: string;
}

export interface DatosNegocioPayload {
  razonSocial: string;
  direccion: string;
  ciudad: string;
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
