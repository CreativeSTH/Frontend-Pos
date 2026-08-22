import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { ItemPedido } from '../models/item-pedido.model';

@Injectable({ providedIn: 'root' })
export class ListaPedidosService {
  private readonly api = inject(ApiService);

  /** Contador de pendientes — para un badge en el sidebar si hace falta más adelante. */
  private readonly _pendientes = signal(0);
  readonly pendientes = this._pendientes.asReadonly();

  findAll(comprado?: boolean) {
    return this.api.get<ItemPedido[]>('/lista-pedidos', comprado !== undefined ? { comprado } : undefined);
  }

  /** Idempotente — si el producto ya está pendiente, el backend devuelve el registro existente sin duplicar. */
  agregar(productoId: string) {
    return this.api.post<ItemPedido>('/lista-pedidos', { productoId });
  }

  marcarComprado(id: string) {
    return this.api.patch<ItemPedido>(`/lista-pedidos/${id}/comprado`, {});
  }

  remove(id: string) {
    return this.api.delete<void>(`/lista-pedidos/${id}`);
  }

  refrescarPendientes() {
    return this.findAll(false).pipe(tap((items) => this._pendientes.set(items.length)));
  }
}
