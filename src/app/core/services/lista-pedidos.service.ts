import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  ConfirmarIngresoPayload,
  EstadoItemPedido,
  ItemPedido,
  RealizarPedidoPayload,
} from '../models/item-pedido.model';

@Injectable({ providedIn: 'root' })
export class ListaPedidosService {
  private readonly api = inject(ApiService);

  /** Contador de pendientes — para un badge en el sidebar si hace falta más adelante. */
  private readonly _pendientes = signal(0);
  readonly pendientes = this._pendientes.asReadonly();

  findAll(estado?: EstadoItemPedido) {
    return this.api.get<ItemPedido[]>('/lista-pedidos', estado ? { estado } : undefined);
  }

  /** Idempotente — si el producto ya está pendiente, el backend devuelve el registro existente sin duplicar. */
  agregar(productoId: string) {
    return this.api.post<ItemPedido>('/lista-pedidos', { productoId });
  }

  realizarPedido(id: string, payload: RealizarPedidoPayload) {
    return this.api.patch<ItemPedido>(`/lista-pedidos/${id}/pedir`, payload);
  }

  confirmarIngreso(id: string, payload: ConfirmarIngresoPayload) {
    return this.api.patch<ItemPedido>(`/lista-pedidos/${id}/confirmar-ingreso`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/lista-pedidos/${id}`);
  }

  refrescarPendientes() {
    return this.findAll('PENDIENTE').pipe(tap((items) => this._pendientes.set(items.length)));
  }
}
