import { Bodega } from '../../core/models/bodega.model';

/** Única respuesta en el frontend a "¿esta bodega es de esta sucursal?" — mismo criterio que el backend. */
export function bodegaEnSucursal(bodega: Bodega, sucursalId: string | null | undefined): boolean {
  return !!sucursalId && bodega.sucursalIds.includes(sucursalId);
}

/** Bodega central: no está asociada a ninguna sucursal, nadie vende de ella. */
export function esCedi(bodega: Bodega): boolean {
  return bodega.sucursalIds.length === 0;
}
