export interface Categoria {
  id: string;
  negocioId: string;
  nombre: string;
  categoriaPadreId?: string;
  activo: boolean;
}
