export type EstadoSuscripcion = 'PRUEBA' | 'ACTIVA' | 'VENCIDA';

export interface Suscripcion {
  id: string;
  negocioId: string;
  paqueteId: string;
  paquete: { id: string; nombre: string; precioMensual: number };
  estado: EstadoSuscripcion;
  fechaInicio: string;
  fechaFin: string | null;
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
  paqueteId: string;
}
