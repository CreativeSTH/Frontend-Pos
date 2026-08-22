export interface Sucursal {
  id: string;
  negocioId: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
}
