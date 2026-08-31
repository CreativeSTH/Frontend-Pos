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
}

export type UpdatePaquetePayload = Partial<CreatePaquetePayload>;
