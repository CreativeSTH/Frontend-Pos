export interface Paquete {
  id: string;
  nombre: string;
  descripcion?: string;
  precioMensual: number;
  facturacionDianHabilitada: boolean;
  documentosDianPorMes: number;
  tiendaOnlineHabilitada: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  esPaqueteFree: boolean;
  /** Único a la vez — el que recibe automáticamente todo registro público durante el trial de 20 días. */
  esPaqueteTrialCompleto: boolean;
  activo: boolean;
  createdAt: string;
}

export interface CreatePaquetePayload {
  nombre: string;
  descripcion?: string;
  precioMensual: number;
  facturacionDianHabilitada: boolean;
  documentosDianPorMes: number;
  tiendaOnlineHabilitada: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  esPaqueteTrialCompleto?: boolean;
}

export type UpdatePaquetePayload = Partial<CreatePaquetePayload>;
