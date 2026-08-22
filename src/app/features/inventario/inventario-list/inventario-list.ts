import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Thumbnail } from '../../../shared/ui/atoms/thumbnail/thumbnail';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import {
  InventarioItem,
  InventarioService,
  MovimientoInventario,
  TipoAjusteInventario,
} from '../../../core/services/inventario.service';
import { ProductosService } from '../../../core/services/productos.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Producto } from '../../../core/models/producto.model';
import { Bodega } from '../../../core/models/bodega.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Marca } from '../../../core/models/marca.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    Thumbnail,
    Table,
    Modal,
    FormField,
    Input,
    Select,
    SearchBar,
    EmptyState,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './inventario-list.html',
  styleUrl: './inventario-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioList {
  private readonly inventarioService = inject(InventarioService);
  private readonly productosService = inject(ProductosService);
  private readonly bodegasService = inject(BodegasService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly marcasService = inject(MarcasService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);

  protected readonly search = signal('');
  protected readonly filtroCategoriaId = signal('');
  protected readonly filtroMarcaId = signal('');
  protected readonly filtroBodegaId = signal('');

  protected readonly inventarioFiltrado = computed(() => {
    const term = this.search().toLowerCase().trim();
    const categoriaId = this.filtroCategoriaId();
    const marcaId = this.filtroMarcaId();
    const bodegaId = this.filtroBodegaId();
    const productosPorId = new Map(this.productos().map((p) => [p.id, p]));

    return this.inventario().filter((item) => {
      const producto = productosPorId.get(item.productoId);
      if (bodegaId && item.bodegaId !== bodegaId) return false;
      if (categoriaId && producto?.categoriaId !== categoriaId) return false;
      if (marcaId && producto?.marcaId !== marcaId) return false;
      if (term) {
        const nombre = item.producto?.nombre?.toLowerCase() ?? '';
        const codigo = item.producto?.codigoBarras?.toLowerCase() ?? '';
        if (!nombre.includes(term) && !codigo.includes(term)) return false;
      }
      return true;
    });
  });

  protected readonly showAjuste = signal(false);
  protected readonly productoId = signal('');
  protected readonly bodegaId = signal('');
  protected readonly tipo = signal<TipoAjusteInventario>('ENTRADA');
  protected readonly cantidad = signal<number>(0);
  protected readonly motivo = signal('');
  protected readonly guardando = signal(false);

  protected readonly showMinimo = signal(false);
  protected readonly itemMinimo = signal<InventarioItem | null>(null);
  protected readonly nuevoMinimo = signal<number>(0);

  protected readonly showKardex = signal(false);
  protected readonly kardexItem = signal<InventarioItem | null>(null);
  protected readonly kardexMovimientos = signal<MovimientoInventario[]>([]);
  protected readonly kardexCargando = signal(false);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      inventario: this.inventarioService.findAll(),
      productos: this.productosService.findAll(),
      bodegas: this.bodegasService.findAll(),
      categorias: this.categoriasService.findAll(),
      marcas: this.marcasService.findAll(),
    }).subscribe({
      next: ({ inventario, productos, bodegas, categorias, marcas }) => {
        this.inventario.set(inventario);
        this.productos.set(productos);
        this.bodegas.set(bodegas);
        this.categorias.set(categorias);
        this.marcas.set(marcas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el inventario');
      },
    });
  }

  protected kardexTono(tipo: MovimientoInventario['tipo']): 'success' | 'danger' | 'info' {
    if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') return 'success';
    if (tipo === 'SALIDA' || tipo === 'VENTA') return 'danger';
    return 'info';
  }

  protected imageUrl(imagenUrl?: string | null): string | null {
    if (!imagenUrl) return null;
    return `${environment.assetsUrl}${imagenUrl}`;
  }

  protected productosSinRegistrar(): number {
    const conStock = new Set(this.inventario().map((i) => i.productoId));
    return this.productos().filter((p) => !conStock.has(p.id)).length;
  }

  protected abrirAjuste(item?: InventarioItem): void {
    this.productoId.set(item?.productoId ?? this.productos()[0]?.id ?? '');
    this.bodegaId.set(item?.bodegaId ?? this.bodegas()[0]?.id ?? '');
    this.tipo.set('ENTRADA');
    this.cantidad.set(0);
    this.motivo.set('');
    this.showAjuste.set(true);
  }

  protected confirmarAjuste(): void {
    if (!this.productoId() || !this.bodegaId() || this.cantidad() <= 0) {
      this.toast.error('Selecciona producto, bodega y una cantidad válida');
      return;
    }
    this.guardando.set(true);
    this.inventarioService
      .ajustar({
        productoId: this.productoId(),
        bodegaId: this.bodegaId(),
        tipo: this.tipo(),
        cantidad: this.cantidad(),
        motivo: this.motivo() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.showAjuste.set(false);
          this.toast.success('Stock actualizado');
          this.load();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo ajustar el stock');
        },
      });
  }

  protected abrirKardex(item: InventarioItem): void {
    this.kardexItem.set(item);
    this.showKardex.set(true);
    this.kardexCargando.set(true);
    this.inventarioService.kardex({ productoId: item.productoId, bodegaId: item.bodegaId }).subscribe({
      next: (movimientos) => {
        this.kardexMovimientos.set(movimientos);
        this.kardexCargando.set(false);
      },
      error: () => {
        this.kardexCargando.set(false);
        this.toast.error('No se pudo cargar el kardex');
      },
    });
  }

  protected abrirMinimo(item: InventarioItem): void {
    this.itemMinimo.set(item);
    this.nuevoMinimo.set(item.stockMinimo);
    this.showMinimo.set(true);
  }

  protected confirmarMinimo(): void {
    const item = this.itemMinimo();
    if (!item) return;
    this.guardando.set(true);
    this.inventarioService.setStockMinimo(item.productoId, item.bodegaId, this.nuevoMinimo()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.showMinimo.set(false);
        this.toast.success('Stock mínimo actualizado');
        this.load();
      },
      error: () => {
        this.guardando.set(false);
        this.toast.error('No se pudo actualizar el stock mínimo');
      },
    });
  }
}
