export interface Cliente {
  id: string;
  negocioId: string;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  documentoIdentidad?: string;
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
  limiteCredito?: number;
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
