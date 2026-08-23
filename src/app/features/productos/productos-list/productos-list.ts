import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Thumbnail } from '../../../shared/ui/atoms/thumbnail/thumbnail';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { ProductoForm } from '../producto-form/producto-form';
import { forkJoin } from 'rxjs';
import { ProductosService } from '../../../core/services/productos.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { InventarioItem, InventarioService } from '../../../core/services/inventario.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Producto } from '../../../core/models/producto.model';
import { Marca } from '../../../core/models/marca.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    Table,
    Modal,
    SearchBar,
    EmptyState,
    Thumbnail,
    Paginator,
    ProductoForm,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosList {
  private readonly productosService = inject(ProductosService);
  private readonly marcasService = inject(MarcasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly loading = signal(true);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly stockPorProducto = signal<Map<string, number>>(new Map());
  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingProducto = signal<Producto | null>(null);

  protected readonly filtrados = () => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.productos();
    return this.productos().filter(
      (p) => p.nombre.toLowerCase().includes(term) || p.codigoBarras?.includes(term),
    );
  };

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly productosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.filtrados().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      productos: this.productosService.findAll(),
      inventario: this.inventarioService.findAll(),
    }).subscribe({
      next: ({ productos, inventario }) => {
        this.productos.set(productos);
        this.inventario.set(inventario);
        const stockMap = new Map<string, number>();
        for (const item of inventario) {
          stockMap.set(item.productoId, (stockMap.get(item.productoId) ?? 0) + Number(item.cantidad));
        }
        this.stockPorProducto.set(stockMap);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los productos');
      },
    });
    this.marcasService.findAll().subscribe((data) => this.marcas.set(data));
  }

  protected nombreMarca(id?: string): string {
    if (!id) return '—';
    return this.marcas().find((m) => m.id === id)?.nombre ?? '—';
  }

  protected etiquetaImpuesto(producto: Producto): string {
    if (producto.tipoImpuesto === 'EXCLUIDO') return 'Excluido';
    if (producto.tipoImpuesto === 'EXENTO') return 'Exento';
    return `${producto.porcentajeImpuesto}%`;
  }

  protected stockDe(productoId: string): number | null {
    const stock = this.stockPorProducto();
    return stock.has(productoId) ? stock.get(productoId)! : null;
  }

  protected openCreate(): void {
    this.editingProducto.set(null);
    this.showForm.set(true);
  }

  protected openEdit(producto: Producto): void {
    this.editingProducto.set(producto);
    this.showForm.set(true);
  }

  protected onGuardado(): void {
    this.showForm.set(false);
    this.load();
  }

  protected async eliminar(producto: Producto): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${producto.nombre}"?`, danger: true }))) return;
    this.productosService.remove(producto.id).subscribe({
      next: () => {
        this.toast.success('Producto eliminado');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar el producto'),
    });
  }

  protected imageUrl(imagenUrl?: string | null): string | null {
    if (!imagenUrl) return null;
    return `${environment.assetsUrl}${imagenUrl}`;
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
