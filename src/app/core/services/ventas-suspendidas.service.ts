import { effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

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
 * navega a otra pantalla del POS y vuelve. Persiste en localStorage
 * (clave scopeada por negocioId, porque el mismo navegador puede entrar
 * como soporte a varios negocios) para sobrevivir también a un refresh
 * del navegador o al logout forzado por un PIN incorrecto (ver
 * auth.interceptor.ts) — el `effect()` re-hidrata sola si cambia el
 * negocio activo, mismo patrón que AlertasService/RealtimeService.
 */
@Injectable({ providedIn: 'root' })
export class VentasSuspendidasService {
  private readonly auth = inject(AuthService);
  private readonly _ventas = signal<VentaSuspendida[]>([]);
  readonly ventas = this._ventas.asReadonly();

  constructor() {
    effect(() => {
      const negocioId = this.auth.usuario()?.negocioId;
      this._ventas.set(this.leerStorage(negocioId));
    });
  }

  suspender(carrito: LineaCarritoSuspendida[], descuentoVenta: number, nota?: string): void {
    const nueva: VentaSuspendida = {
      id: crypto.randomUUID(),
      nota: nota?.trim() || undefined,
      creadaEn: new Date().toISOString(),
      carrito,
      descuentoVenta,
    };
    this.actualizar((lista) => [nueva, ...lista]);
  }

  /** Retira la venta suspendida de la lista y la devuelve para restaurarla como carrito activo. */
  retomar(id: string): VentaSuspendida | undefined {
    const venta = this._ventas().find((v) => v.id === id);
    if (venta) {
      this.actualizar((lista) => lista.filter((v) => v.id !== id));
    }
    return venta;
  }

  eliminar(id: string): void {
    this.actualizar((lista) => lista.filter((v) => v.id !== id));
  }

  private actualizar(fn: (lista: VentaSuspendida[]) => VentaSuspendida[]): void {
    const lista = fn(this._ventas());
    this._ventas.set(lista);
    this.guardarStorage(lista);
  }

  private clave(negocioId: string | null | undefined): string {
    return `pos:ventas-suspendidas:${negocioId ?? 'anon'}`;
  }

  private leerStorage(negocioId: string | null | undefined): VentaSuspendida[] {
    try {
      const raw = localStorage.getItem(this.clave(negocioId));
      return raw ? (JSON.parse(raw) as VentaSuspendida[]) : [];
    } catch {
      return [];
    }
  }

  private guardarStorage(lista: VentaSuspendida[]): void {
    localStorage.setItem(this.clave(this.auth.usuario()?.negocioId), JSON.stringify(lista));
  }
}
