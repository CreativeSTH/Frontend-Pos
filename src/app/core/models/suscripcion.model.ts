export type EstadoSuscripcion = 'PRUEBA' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

export interface Suscripcion {
  id: string;
  negocioId: string;
  paqueteId: string;
  paquete: { id: string; nombre: string; precioMensual: number; facturacionDianHabilitada: boolean; tiendaOnlineHabilitada: boolean };
  estado: EstadoSuscripcion;
  fechaInicio: string;
  fechaFin: string | null;
  enRiesgo: boolean;
  /** Misma regla que usa el backend para bloquear el resto de la API — no asumir que solo VENCIDA está bloqueada. */
  bloqueado: boolean;
}

export interface ReactivarSuscripcionPayload {
  paqueteId?: string;
  metodo: 'QR' | 'NEQUI' | 'PSE' | 'TARJETA';
  datosMetodo: Record<string, unknown>;
  guardarTarjeta?: boolean;
  ultimosCuatroDigitos?: string;
}

export interface RegistroPublicoPayload {
  nombreNegocio: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}
