export type EstadoSuscripcion = 'PRUEBA' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA';
export type CicloFacturacion = 'MENSUAL' | 'ANUAL';

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
  /** true solo durante los 3 días de gracia tras vencer — el resto del tiempo (incluido bloqueado) es false. */
  enGracia: boolean;
  /** Se fija al pagar/reactivar — nunca cambia a mitad de un ciclo ACTIVA vigente. */
  cicloFacturacion: CicloFacturacion;
}

export interface ReactivarSuscripcionPayload {
  paqueteId?: string;
  metodo: 'QR' | 'NEQUI' | 'PSE' | 'TARJETA';
  datosMetodo: Record<string, unknown>;
  guardarTarjeta?: boolean;
  ultimosCuatroDigitos?: string;
  cicloFacturacion?: CicloFacturacion;
}

export interface RegistroPublicoPayload {
  nombreNegocio: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}

export interface MedioPagoEstado {
  activo: boolean;
  ultimosCuatroDigitos: string | null;
}

export interface PagoSuscripcion {
  id: string;
  fecha: string;
  confirmadoEn: string | null;
  paquete: string;
  ciclo: CicloFacturacion;
  metodo: 'QR' | 'NEQUI' | 'PSE' | 'TARJETA';
  montoEnCentavos: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'DECLINADA';
  origen: 'MANUAL' | 'AUTOMATICO';
}

/** No se llama `HistorialPagos` para no chocar con el componente del mismo nombre. */
export interface PaginaPagosSuscripcion {
  items: PagoSuscripcion[];
  total: number;
  pagina: number;
  porPagina: number;
}
