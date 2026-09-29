export interface Cliente {
  id: string;
  negocioId: string;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  documentoIdentidad?: string;
  tipoDocumentoIdentidad?: string;
  limiteCredito: number;
  deudaActual: number;
  score: number;
  bloqueadoPorMora: boolean;
  fechaBloqueo?: string;
  motivoBloqueo?: string;
  activo: boolean;
  createdAt: string;
}

export interface CreateClientePayload {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  documentoIdentidad?: string;
  tipoDocumentoIdentidad?: string;
  limiteCredito?: number;
}

/** Catálogo DIAN permitido (mismo que `TIPOS_DOCUMENTO_IDENTIDAD` del backend). */
export const TIPOS_DOCUMENTO_IDENTIDAD = [
  { valor: '13', sigla: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: '31', sigla: 'NIT', etiqueta: 'NIT' },
  { valor: '22', sigla: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: '41', sigla: 'PA', etiqueta: 'Pasaporte' },
  { valor: '12', sigla: 'TI', etiqueta: 'Tarjeta de identidad' },
  { valor: '47', sigla: 'PEP', etiqueta: 'Permiso especial de permanencia' },
  { valor: '48', sigla: 'PPT', etiqueta: 'Permiso por protección temporal' },
] as const;

export function siglaDocumento(tipo?: string): string {
  return TIPOS_DOCUMENTO_IDENTIDAD.find((t) => t.valor === tipo)?.sigla ?? 'Doc.';
}

export interface VerificarCreditoResponse {
  aprobado: boolean;
  limiteCredito: number;
  deudaActual: number;
  creditoDisponible: number;
  montoSolicitado: number;
  creditoRestante?: number;
  mensaje?: string;
}
