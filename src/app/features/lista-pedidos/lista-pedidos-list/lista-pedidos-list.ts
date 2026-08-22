import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { ListaPedidosService } from '../../../core/services/lista-pedidos.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { ProductosService } from '../../../core/services/productos.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EstadoItemPedido, ItemPedido } from '../../../core/models/item-pedido.model';
import { ProductoProveedor, Proveedor } from '../../../core/models/proveedor.model';
import { Bodega } from '../../../core/models/bodega.model';
import { Producto } from '../../../core/models/producto.model';

const NUEVO_PROVEEDOR = '__nuevo__';

interface TabInfo {
  estado: EstadoItemPedido;
  label: string;
}

const TABS: TabInfo[] = [
  { estado: 'PENDIENTE', label: 'Pendientes' },
  { estado: 'PEDIDO', label: 'Pedidos' },
  { estado: 'INGRESADO', label: 'Historial' },
];

@Component({
  selector: 'app-lista-pedidos-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, Select, EmptyState, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './lista-pedidos-list.html',
  styleUrl: './lista-pedidos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaPedidosList {
  private readonly listaPedidosService = inject(ListaPedidosService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly bodegasService = inject(BodegasService);
  private readonly productosService = inject(ProductosService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly tabs = TABS;
  protected readonly loading = signal(true);
  protected readonly items = signal<ItemPedido[]>([]);
  protected readonly tabActual = signal<EstadoItemPedido>('PENDIENTE');

  protected readonly itemsFiltrados = computed(() =>
    this.items().filter((i) => i.estado === this.tabActual()),
  );

  // --- Realizar pedido ---
  protected readonly showPedidoModal = signal(false);
  protected readonly itemPedidoActual = signal<ItemPedido | null>(null);
  /** Catálogo completo del negocio — se puede pedir a cualquier proveedor, no solo a los ya vinculados a este producto. */
  protected readonly proveedoresCatalogo = signal<Proveedor[]>([]);
  /** Vínculos ya existentes de ESTE producto — solo se usan para precargar el costo pactado. */
  protected readonly proveedoresProducto = signal<ProductoProveedor[]>([]);
  protected readonly proveedorSeleccionado = signal<string>('');
  protected readonly nombreProveedorNuevo = signal('');
  protected readonly costoUnitario = signal<number>(0);
  protected readonly cantidad = signal<number>(1);
  protected readonly guardandoPedido = signal(false);
  protected readonly NUEVO_PROVEEDOR = NUEVO_PROVEEDOR;

  // --- Confirmar ingreso ---
  protected readonly showIngresoModal = signal(false);
  protected readonly itemIngresoActual = signal<ItemPedido | null>(null);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly bodegaSeleccionada = signal<string>('');
  protected readonly productoActual = signal<Producto | null>(null);
  protected readonly guardandoIngreso = signal(false);

  // --- Sub-diálogo: el costo cambió, ¿actualizar precio de venta? ---
  protected readonly showPrecioModal = signal(false);
  protected readonly nuevoPrecioVenta = signal<number>(0);
  protected readonly costoSubio = signal(true);

  constructor() {
    this.load();
    this.proveedoresService.findAll().subscribe((data) => this.proveedoresCatalogo.set(data));
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

  private reemplazarItem(actualizado: ItemPedido): void {
    this.items.update((lista) => lista.map((i) => (i.id === actualizado.id ? actualizado : i)));
  }

  protected async quitar(item: ItemPedido): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Quitar "${item.nombreProducto}" de la lista?`, danger: true })))
      return;
    this.listaPedidosService.remove(item.id).subscribe({
      next: () => {
        this.items.update((lista) => lista.filter((i) => i.id !== item.id));
        this.toast.success('Quitado de la lista');
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo quitar el ítem'),
    });
  }

  // ---------- Realizar pedido ----------

  protected abrirRealizarPedido(item: ItemPedido): void {
    this.itemPedidoActual.set(item);
    this.proveedorSeleccionado.set('');
    this.nombreProveedorNuevo.set('');
    this.costoUnitario.set(0);
    this.cantidad.set(1);
    this.proveedoresProducto.set([]);
    this.proveedoresService.porProducto(item.productoId).subscribe({
      next: (proveedores) => this.proveedoresProducto.set(proveedores),
      error: () => this.toast.error('No se pudieron cargar los proveedores del producto'),
    });
    this.showPedidoModal.set(true);
  }

  protected onProveedorChange(proveedorId: string): void {
    this.proveedorSeleccionado.set(proveedorId);
    const vinculo = this.proveedoresProducto().find((p) => p.proveedorId === proveedorId);
    if (vinculo) {
      this.costoUnitario.set(Number(vinculo.costo));
    }
  }

  protected confirmarPedido(): void {
    const item = this.itemPedidoActual();
    if (!item) return;

    const proveedorId = this.proveedorSeleccionado();
    if (!proveedorId) {
      this.toast.error('Elegí un proveedor');
      return;
    }
    if (proveedorId === NUEVO_PROVEEDOR && !this.nombreProveedorNuevo().trim()) {
      this.toast.error('Escribí el nombre del nuevo proveedor');
      return;
    }
    if (this.costoUnitario() <= 0) {
      this.toast.error('El costo debe ser mayor a 0');
      return;
    }
    if (this.cantidad() <= 0) {
      this.toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    this.guardandoPedido.set(true);
    this.listaPedidosService
      .realizarPedido(item.id, {
        proveedorId: proveedorId === NUEVO_PROVEEDOR ? undefined : proveedorId,
        proveedorNuevo: proveedorId === NUEVO_PROVEEDOR ? { nombre: this.nombreProveedorNuevo().trim() } : undefined,
        costoUnitario: this.costoUnitario(),
        cantidad: this.cantidad(),
      })
      .subscribe({
        next: (actualizado) => {
          this.guardandoPedido.set(false);
          this.showPedidoModal.set(false);
          this.reemplazarItem(actualizado);
          if (proveedorId === NUEVO_PROVEEDOR) {
            this.proveedoresService.findAll().subscribe((data) => this.proveedoresCatalogo.set(data));
          }
          this.toast.success(`Pedido realizado a ${actualizado.nombreProveedor}`);
        },
        error: (err) => {
          this.guardandoPedido.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo realizar el pedido');
        },
      });
  }

  // ---------- Confirmar ingreso ----------

  protected abrirConfirmarIngreso(item: ItemPedido): void {
    this.itemIngresoActual.set(item);
    this.bodegaSeleccionada.set('');
    this.productoActual.set(null);
    this.bodegasService.findAll().subscribe({
      next: (bodegas) => {
        this.bodegas.set(bodegas);
        this.bodegaSeleccionada.set(bodegas[0]?.id ?? '');
      },
      error: () => this.toast.error('No se pudieron cargar las bodegas'),
    });
    this.productosService.findOne(item.productoId).subscribe({
      next: (producto) => this.productoActual.set(producto),
      error: () => this.toast.error('No se pudo cargar el producto'),
    });
    this.showIngresoModal.set(true);
  }

  /** Si el costo cambió respecto al costo actual del producto (subió o bajó), primero pregunta si se actualiza el precio de venta. */
  protected confirmarIngresoClick(): void {
    if (!this.bodegaSeleccionada()) {
      this.toast.error('Elegí la bodega donde entra el stock');
      return;
    }
    const item = this.itemIngresoActual();
    const producto = this.productoActual();
    if (item?.costoUnitario && producto && item.costoUnitario !== Number(producto.costo)) {
      this.costoSubio.set(item.costoUnitario > Number(producto.costo));
      this.nuevoPrecioVenta.set(Number(producto.precioVenta));
      this.showPrecioModal.set(true);
      return;
    }
    this.finalizarIngreso();
  }

  protected finalizarIngreso(nuevoPrecioVenta?: number): void {
    const item = this.itemIngresoActual();
    if (!item) return;

    this.guardandoIngreso.set(true);
    this.listaPedidosService
      .confirmarIngreso(item.id, { bodegaId: this.bodegaSeleccionada(), nuevoPrecioVenta })
      .subscribe({
        next: (actualizado) => {
          this.guardandoIngreso.set(false);
          this.showPrecioModal.set(false);
          this.showIngresoModal.set(false);
          this.reemplazarItem(actualizado);
          this.toast.success('Ingreso confirmado — stock y costo actualizados');
        },
        error: (err) => {
          this.guardandoIngreso.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo confirmar el ingreso');
        },
      });
  }

  protected confirmarSinActualizarPrecio(): void {
    this.finalizarIngreso();
  }

  protected confirmarActualizandoPrecio(): void {
    if (this.nuevoPrecioVenta() <= 0) {
      this.toast.error('El precio de venta debe ser mayor a 0');
      return;
    }
    this.finalizarIngreso(this.nuevoPrecioVenta());
  }
}
