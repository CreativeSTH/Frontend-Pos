import { environment } from '../../../../environments/environment';

export interface LineaConPrecio {
  precioUnitario: number;
  cantidad: number;
  porcentajeImpuesto: number;
}

/** Compartido entre el carrito activo (`PuntoVenta`) y una venta suspendida — misma forma de línea. */
export function calcularSubtotal(lineas: LineaConPrecio[]): number {
  return lineas.reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0);
}

export function calcularImpuesto(lineas: LineaConPrecio[]): number {
  return lineas.reduce((sum, l) => sum + l.precioUnitario * l.cantidad * (l.porcentajeImpuesto / 100), 0);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  );
}

export function imageUrl(imagenUrl?: string | null): string | null {
  if (!imagenUrl) return null;
  return `${environment.assetsUrl}${imagenUrl}`;
}
