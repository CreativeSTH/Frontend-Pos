export type PlanNegocio = 'FREE' | 'BASICO' | 'PRO';

export interface Negocio {
  id: string;
  nombre: string;
  nit?: string;
  tipoNegocio?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  plan: PlanNegocio;
  activo: boolean;
  createdAt: string;
}

export interface CreateNegocioPayload {
  nombre: string;
  nit?: string;
  tipoNegocio?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  adminInicial: { nombre: string; email: string; password: string };
}

export type UpdateNegocioPayload = Partial<Omit<CreateNegocioPayload, 'adminInicial'>>;
