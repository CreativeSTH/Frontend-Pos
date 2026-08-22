export type RolUsuario = 'SUPER_ADMIN' | 'ADMIN_NEGOCIO' | 'CAJERO';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  negocioId: string | null;
  sucursalId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioSesion;
}
