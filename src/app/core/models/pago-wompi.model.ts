export type MetodoPagoWompi = 'QR' | 'NEQUI' | 'PSE' | 'TARJETA';

export interface ConfiguracionWompi {
  llavePublica: string | null;
  activo: boolean;
  configurado: boolean;
  qrHabilitado: boolean;
  nequiHabilitado: boolean;
  pseHabilitado: boolean;
  tarjetaHabilitado: boolean;
}

export interface GuardarConfiguracionWompiPayload {
  llavePublica: string;
  llavePrivada: string;
  llaveSecretaEventos: string;
  llaveIntegridad: string;
  qrHabilitado?: boolean;
  nequiHabilitado?: boolean;
  pseHabilitado?: boolean;
  tarjetaHabilitado?: boolean;
}

export interface IniciarPagoWompiPayload {
  montoEnCentavos: number;
  metodo: MetodoPagoWompi;
  datosMetodo: Record<string, unknown>;
}

export interface PagoWompiIniciado {
  referencia: string;
  wompiTransactionId: string;
  /**
   * Datos extra específicos del método, tal cual los devuelve Wompi sin interpretar (ver
   * `wompi-client.service.ts` en el backend) — para QR trae `qr_image` (string en base64,
   * formato del prefijo `data:` sin confirmar); NEQUI no trae nada acá.
   */
  extra?: Record<string, unknown>;
}
