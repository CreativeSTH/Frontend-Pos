import { RolUsuario } from './auth.model';

export interface Usuario {
  id: string;
  negocioId: string | null;
  sucursalId: string | null;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
  sucursalId?: string;
  pin?: string;
}

export type UpdateUsuarioPayload = Partial<Omit<CreateUsuarioPayload, 'password'>>;
