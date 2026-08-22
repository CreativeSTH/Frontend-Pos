import { Rol } from './rol.model';

export interface Usuario {
  id: string;
  negocioId: string | null;
  sucursalId: string | null;
  nombre: string;
  email: string;
  rolId: string;
  rol?: Rol;
  activo: boolean;
  createdAt: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rolId: string;
  sucursalId?: string;
  pin?: string;
}

export type UpdateUsuarioPayload = Partial<Omit<CreateUsuarioPayload, 'password'>>;
