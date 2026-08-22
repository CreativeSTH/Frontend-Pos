import { Injectable, signal } from '@angular/core';

export interface LineaCarritoSuspendida {
  productoId: string;
  nombre: string;
  imagenUrl?: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  porcentajeImpuesto: number;
}

export interface VentaSuspendida {
  id: string;
  nota?: string;
  creadaEn: string;
  carrito: LineaCarritoSuspendida[];
  descuentoVenta: number;
}

/**
 * "Suspender venta" (patrón D365/LS Retail/Lightspeed): pausa el carrito en
 * curso para atender a otro cliente, sin crear ninguna venta ni tocar stock
 * — solo se guarda el ticket en memoria hasta que se retoma o se descarta.
 * Vive en un servicio (no en el componente) para sobrevivir si el cajero
 * navega a otra pantalla del POS y vuelve.
 */
@Injectable({ providedIn: 'root' })
export class VentasSuspendidasService {
  private readonly _ventas = signal<VentaSuspendida[]>([]);
  readonly ventas = this._ventas.asReadonly();

  suspender(carrito: LineaCarritoSuspendida[], descuentoVenta: number, nota?: string): void {
    const nueva: VentaSuspendida = {
      id: crypto.randomUUID(),
      nota: nota?.trim() || undefined,
      creadaEn: new Date().toISOString(),
      carrito,
      descuentoVenta,
    };
    this._ventas.update((lista) => [nueva, ...lista]);
  }

  /** Retira la venta suspendida de la lista y la devuelve para restaurarla como carrito activo. */
  retomar(id: string): VentaSuspendida | undefined {
    const venta = this._ventas().find((v) => v.id === id);
    if (venta) {
      this._ventas.update((lista) => lista.filter((v) => v.id !== id));
    }
    return venta;
  }

  eliminar(id: string): void {
    this._ventas.update((lista) => lista.filter((v) => v.id !== id));
  }
}
