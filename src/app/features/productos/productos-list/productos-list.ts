import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { Select } from '../../../shared/ui/atoms/select/select';
import { ProductoForm } from '../producto-form/producto-form';
import { forkJoin } from 'rxjs';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { ProductosService } from '../../../core/services/productos.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { SucursalContextService } from '../../../core/services/sucursal-context.service';
import { InventarioItem, InventarioService } from '../../../core/services/inventario.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Producto } from '../../../core/models/producto.model';
import { Marca } from '../../../core/models/marca.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Bodega } from '../../../core/models/bodega.model';
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
    Select,
    EmptyState,
    Thumbnail,
    Paginator,
    ProductoForm,
    FormsModule,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosList {
  private readonly productosService = inject(ProductosService);
  private readonly marcasService = inject(MarcasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly bodegasService = inject(BodegasService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly loading = signal(true);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingProducto = signal<Producto | null>(null);

  /** '' = todas las sucursales (sin agrupar por bodega tampoco tiene sentido ahí, ver `bodegaFiltroId`). */
  protected readonly sucursalFiltroId = signal('');
  /** '' = todas las bodegas de la sucursal elegida (o de todo el negocio si tampoco hay sucursal elegida). */
  protected readonly bodegaFiltroId = signal('');

  /** Bodegas de la sucursal elegida en el filtro — vacío si "todas las sucursales". */
  protected readonly bodegasDelFiltro = computed(() =>
    this.bodegas().filter((b) => b.sucursalId === this.sucursalFiltroId()),
  );

/** Ids de bodega que el filtro actual habilita — una sola si hay bodega elegida, todas las de la sucursal si no. */
  private readonly bodegaIdsDelAlcance = computed(() => {
    const bodegaId = this.bodegaFiltroId();
    if (bodegaId) return new Set([bodegaId]);
    const sucursalId = this.sucursalFiltroId();
    const bodegasDeLaSucursal = sucursalId ? this.bodegas().filter((b) => b.sucursalId === sucursalId) : this.bodegas();
    return new Set(bodegasDeLaSucursal.map((b) => b.id));
  });

  /** Stock de cada producto, recalculado según el filtro de sucursal/bodega — nunca suma bodegas fuera del alcance elegido. */
  protected readonly stockPorProducto = computed(() => {
    const alcance = this.bodegaIdsDelAlcance();
    const stockMap = new Map<string, number>();
    for (const item of this.inventario()) {
      if (!alcance.has(item.bodegaId)) continue;
      stockMap.set(item.productoId, (stockMap.get(item.productoId) ?? 0) + Number(item.cantidad));
    }
    return stockMap;
  });

  /**
   * Solo los productos que tienen algún registro de inventario (aunque sea en 0) en el alcance
   * elegido — "los productos de esta bodega/sucursal" son los que ya se le asignaron, no todo el
   * catálogo del negocio. Un producto sin ningún registro en ninguna bodega (raro — el form de
   * creación exige asignar al menos una) no aparece hasta que se le cargue stock en alguna.
   */
  protected readonly productosEnAlcance = computed(() => {
    const alcance = this.bodegaIdsDelAlcance();
    const idsConRegistro = new Set(
      this.inventario()
        .filter((i) => alcance.has(i.bodegaId))
        .map((i) => i.productoId),
    );
    return this.productos().filter((p) => idsConRegistro.has(p.id));
  });

  protected readonly filtrados = computed(() => {
    const term = this.search().toLowerCase().trim();
    const base = this.productosEnAlcance();
    if (!term) return base;
    return base.filter((p) => p.nombre.toLowerCase().includes(term) || p.codigoBarras?.includes(term));
  });

  protected readonly pag = usePaginacion(this.filtrados);
  protected readonly productosPaginados = this.pag.itemsPaginados;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      productos: this.productosService.findAll(),
      inventario: this.inventarioService.findAll(),
      sucursales: this.sucursalesService.findAll(),
      bodegas: this.bodegasService.findAll(),
    }).subscribe({
      next: ({ productos, inventario, sucursales, bodegas }) => {
        this.productos.set(productos);
        this.inventario.set(inventario);
        this.sucursales.set(sucursales);
        this.bodegas.set(bodegas);
        // Solo en la primera carga — recargar tras guardar/eliminar un producto no debe pisar el filtro que ya eligió el usuario.
        if (!this.sucursalFiltroId()) {
          this.inicializarFiltroSucursal(sucursales, bodegas);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los productos');
      },
    });
    this.marcasService.findAll().subscribe((data) => this.marcas.set(data));
  }

  /** Arranca en la sucursal activa (misma que usa el resto de la app) y, dentro de ella, en su bodega operativa si tiene una. */
  private inicializarFiltroSucursal(sucursales: Sucursal[], bodegas: Bodega[]): void {
    const activa = sucursales.find((s) => s.id === this.sucursalContext.sucursalId()) ?? sucursales[0];
    if (!activa) return;
    this.sucursalFiltroId.set(activa.id);
    const operativa = bodegas.find((b) => b.id === activa.bodegaOperativaId && b.sucursalId === activa.id);
    this.bodegaFiltroId.set(operativa?.id ?? '');
  }

  /** Cambiar de sucursal reinicia la bodega a la operativa de la nueva sucursal (o "todas" si no tiene) — los ids de la anterior no aplican. */
  protected cambiarSucursalFiltro(sucursalId: string): void {
    this.sucursalFiltroId.set(sucursalId);
    const sucursal = this.sucursales().find((s) => s.id === sucursalId);
    const operativa = this.bodegas().find((b) => b.id === sucursal?.bodegaOperativaId && b.sucursalId === sucursalId);
    this.bodegaFiltroId.set(operativa?.id ?? '');
  }

  /**
   * Máximo 2 categorías visibles por fila (+ badge "+N" si hay más) — con la lista completa, un
   * producto con muchas categorías estiraba su fila a 2-3 líneas mientras las demás quedaban en
   * una sola, descuadrando los bordes de toda la tabla.
   */
  protected categoriasVisibles(producto: Producto) {
    return producto.categorias.slice(0, 2);
  }

  protected categoriasRestantes(producto: Producto): number {
    return Math.max(0, producto.categorias.length - 2);
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
