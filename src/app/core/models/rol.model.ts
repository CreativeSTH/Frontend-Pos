import { AccionPermiso, ModuloPermiso, RolTier } from './auth.model';

export interface Permiso {
  id: string;
  modulo: ModuloPermiso;
  accion: AccionPermiso;
  tier: RolTier;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  tier: RolTier;
  negocioId: string | null;
  esDefault: boolean;
  activo: boolean;
  permisos: Permiso[];
}

export interface CreateRolPayload {
  nombre: string;
  descripcion?: string;
}

export type UpdateRolPayload = Partial<CreateRolPayload>;
