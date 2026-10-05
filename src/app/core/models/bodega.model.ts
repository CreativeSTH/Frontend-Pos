export interface Bodega {
  id: string;
  negocioId: string;
  /** Vacío = bodega central (CEDI); dos o más = compartida (spec 2026-10-04). */
  sucursalIds: string[];
  nombre: string;
  activo: boolean;
}
