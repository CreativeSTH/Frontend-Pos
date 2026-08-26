import { Injectable, computed, signal } from '@angular/core';
import { ItemCarrito } from '../models/cliente-tienda.model';

@Injectable({ providedIn: 'root' })
export class CarritoTiendaService {
  private negocioId = '';
  private readonly _items = signal<ItemCarrito[]>([]);
  readonly items = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((suma, item) => suma + item.precioUnitario * item.cantidad, 0),
  );

  /** Debe llamarse al entrar a `/tienda/:negocioId` — carga el carrito guardado de ESE negocio. */
  cargarNegocio(negocioId: string): void {
    if (this.negocioId === negocioId) return;
    this.negocioId = negocioId;
    const guardado = localStorage.getItem(this.clave());
    this._items.set(guardado ? (JSON.parse(guardado) as ItemCarrito[]) : []);
  }

  agregar(item: Omit<ItemCarrito, 'cantidad'>): void {
    const existente = this._items().find((i) => i.productoId === item.productoId);
    if (existente) {
      this.actualizarCantidad(item.productoId, existente.cantidad + 1);
      return;
    }
    this._items.update((items) => [...items, { ...item, cantidad: 1 }]);
    this.persistir();
  }

  quitar(productoId: string): void {
    this._items.update((items) => items.filter((i) => i.productoId !== productoId));
    this.persistir();
  }

  actualizarCantidad(productoId: string, cantidad: number): void {
    if (cantidad <= 0) {
      this.quitar(productoId);
      return;
    }
    this._items.update((items) =>
      items.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
    );
    this.persistir();
  }

  vaciar(): void {
    this._items.set([]);
    this.persistir();
  }

  private persistir(): void {
    localStorage.setItem(this.clave(), JSON.stringify(this._items()));
  }

  private clave(): string {
    return `pos_carrito_tienda_${this.negocioId}`;
  }
}
