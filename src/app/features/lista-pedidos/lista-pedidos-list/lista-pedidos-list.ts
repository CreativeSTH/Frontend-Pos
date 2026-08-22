import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { ListaPedidosService } from '../../../core/services/lista-pedidos.service';
import { ToastService } from '../../../core/services/toast.service';
import { ItemPedido } from '../../../core/models/item-pedido.model';

@Component({
  selector: 'app-lista-pedidos-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, EmptyState, DatePipe],
  templateUrl: './lista-pedidos-list.html',
  styleUrl: './lista-pedidos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaPedidosList {
  private readonly listaPedidosService = inject(ListaPedidosService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly items = signal<ItemPedido[]>([]);
  protected readonly mostrarComprados = signal(false);

  protected readonly itemsFiltrados = computed(() =>
    this.items().filter((i) => i.comprado === this.mostrarComprados()),
  );

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.listaPedidosService.findAll().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar la lista de pedidos');
      },
    });
  }

  protected marcarComprado(item: ItemPedido): void {
    this.listaPedidosService.marcarComprado(item.id).subscribe({
      next: (actualizado) => {
        this.items.update((lista) => lista.map((i) => (i.id === actualizado.id ? actualizado : i)));
        this.toast.success(`"${item.nombreProducto}" marcado como comprado`);
      },
      error: () => this.toast.error('No se pudo actualizar el ítem'),
    });
  }

  protected quitar(item: ItemPedido): void {
    if (!confirm(`¿Quitar "${item.nombreProducto}" de la lista?`)) return;
    this.listaPedidosService.remove(item.id).subscribe({
      next: () => {
        this.items.update((lista) => lista.filter((i) => i.id !== item.id));
        this.toast.success('Quitado de la lista');
      },
      error: () => this.toast.error('No se pudo quitar el ítem'),
    });
  }
}
