import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { ImageUpload } from '../../../shared/ui/molecules/image-upload/image-upload';
import { Thumbnail } from '../../../shared/ui/atoms/thumbnail/thumbnail';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { forkJoin } from 'rxjs';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { LineasService } from '../../../core/services/lineas.service';
import { InventarioItem, InventarioService } from '../../../core/services/inventario.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Producto, StockInicialPayload, TipoImpuesto } from '../../../core/models/producto.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Marca } from '../../../core/models/marca.model';
import { Linea } from '../../../core/models/linea.model';
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
    FormField,
    Input,
    Select,
    SearchBar,
    EmptyState,
    ImageUpload,
    Thumbnail,
    Paginator,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosList {
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly marcasService = inject(MarcasService);
  private readonly lineasService = inject(LineasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly bodegasService = inject(BodegasService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly stockInicial = signal<StockInicialPayload[]>([]);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly stockPorProducto = signal<Map<string, number>>(new Map());
  protected readonly categoriaIdsSeleccionadas = signal<string[]>([]);

  /** Bodega + cantidad actual/nueva al editar un producto ya existente — ver `guardarAjustesStock()`. */
  protected readonly stockEdicion = signal<{ bodegaId: string; cantidadActual: number; cantidadNueva: number }[]>([]);
  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagenUrl = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    codigoBarras: [''],
    marcaId: [''],
    lineaId: [''],
    unidadMedida: ['UNIDAD', Validators.required],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
    costo: [0, [Validators.required, Validators.min(0)]],
    tipoImpuesto: ['GRAVADO' as TipoImpuesto, Validators.required],
    porcentajeImpuesto: [19],
  });

  protected readonly esGravado = () => this.form.controls.tipoImpuesto.value === 'GRAVADO';

  /** Sub-marcas justo debajo de su marca padre, para mostrarlas indentadas en el <select>. */
  protected readonly marcasOrdenadas = () => {
    const todas = this.marcas();
    const principales = todas.filter((m) => !m.marcaPadreId);
    const resultado: Marca[] = [];
    for (const principal of principales) {
      resultado.push(principal);
      resultado.push(...todas.filter((m) => m.marcaPadreId === principal.id));
    }
    return resultado;
  };

  /** Sub-categorías justo debajo de su categoría padre, para mostrarlas indentadas — mismo patrón que `marcasOrdenadas`. */
  protected readonly categoriasOrdenadas = () => {
    const todas = this.categorias();
    const principales = todas.filter((c) => !c.categoriaPadreId);
    const resultado: Categoria[] = [];
    for (const principal of principales) {
      resultado.push(principal);
      resultado.push(...todas.filter((c) => c.categoriaPadreId === principal.id));
    }
    return resultado;
  };

  protected categoriaSeleccionada(id: string): boolean {
    return this.categoriaIdsSeleccionadas().includes(id);
  }

  protected alternarCategoria(id: string, seleccionada: boolean): void {
    this.categoriaIdsSeleccionadas.update((actuales) =>
      seleccionada ? [...actuales, id] : actuales.filter((c) => c !== id),
    );
  }

  protected readonly lineasDeMarca = () => {
    const marcaId = this.form.controls.marcaId.value;
    if (!marcaId) return [];
    return this.lineas().filter((l) => l.marcaId === marcaId);
  };

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
    this.form.controls.marcaId.valueChanges.subscribe((marcaId) => {
      const lineaActual = this.lineas().find((l) => l.id === this.form.controls.lineaId.value);
      if (lineaActual && lineaActual.marcaId !== marcaId) {
        this.form.controls.lineaId.setValue('');
      }
    });
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
    this.categoriasService.findAll().subscribe((data) => this.categorias.set(data));
    this.marcasService.findAll().subscribe((data) => this.marcas.set(data));
    this.lineasService.findAll().subscribe((data) => this.lineas.set(data));
    this.bodegasService.findAll().subscribe((data) => this.bodegas.set(data));
  }

  protected agregarFilaStock(): void {
    const bodegaLibre = this.bodegas().find((b) => !this.stockInicial().some((s) => s.bodegaId === b.id));
    if (!bodegaLibre) {
      this.toast.info('Ya agregaste todas las bodegas disponibles');
      return;
    }
    this.stockInicial.update((filas) => [...filas, { bodegaId: bodegaLibre.id, cantidad: 0 }]);
  }

  protected actualizarFilaStock(index: number, cambios: Partial<StockInicialPayload>): void {
    this.stockInicial.update((filas) => filas.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }

  protected quitarFilaStock(index: number): void {
    this.stockInicial.update((filas) => filas.filter((_, i) => i !== index));
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
    this.editingId.set(null);
    this.editingImagenUrl.set(null);
    this.selectedImage.set(null);
    this.stockInicial.set([]);
    this.stockEdicion.set([]);
    this.categoriaIdsSeleccionadas.set([]);
    this.form.reset({
      nombre: '',
      codigoBarras: '',
      marcaId: '',
      lineaId: '',
      unidadMedida: 'UNIDAD',
      precioVenta: 0,
      costo: 0,
      tipoImpuesto: 'GRAVADO',
      porcentajeImpuesto: 19,
    });
    this.showForm.set(true);
  }

  protected openEdit(producto: Producto): void {
    this.editingId.set(producto.id);
    this.editingImagenUrl.set(this.imageUrl(producto.imagenUrl));
    this.selectedImage.set(null);
    this.stockInicial.set([]);
    this.categoriaIdsSeleccionadas.set(producto.categorias.map((c) => c.id));
    this.stockEdicion.set(
      this.bodegas().map((bodega) => {
        const cantidadActual = Number(
          this.inventario().find((i) => i.productoId === producto.id && i.bodegaId === bodega.id)?.cantidad ?? 0,
        );
        return { bodegaId: bodega.id, cantidadActual, cantidadNueva: cantidadActual };
      }),
    );
    this.form.reset({
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras ?? '',
      marcaId: producto.marcaId ?? '',
      lineaId: producto.lineaId ?? '',
      unidadMedida: producto.unidadMedida,
      precioVenta: producto.precioVenta,
      costo: producto.costo,
      tipoImpuesto: producto.tipoImpuesto,
      porcentajeImpuesto: producto.porcentajeImpuesto,
    });
    this.showForm.set(true);
  }

  protected actualizarStockEdicion(index: number, cantidadNueva: number): void {
    this.stockEdicion.update((filas) => filas.map((f, i) => (i === index ? { ...f, cantidadNueva } : f)));
  }

  protected nombreBodega(bodegaId: string): string {
    return this.bodegas().find((b) => b.id === bodegaId)?.nombre ?? '—';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const editingId = this.editingId();
    const stockInicial = this.stockInicial().filter((s) => s.bodegaId && s.cantidad > 0);
    const payload = {
      nombre: raw.nombre,
      codigoBarras: raw.codigoBarras || undefined,
      categoriaIds: this.categoriaIdsSeleccionadas(),
      marcaId: raw.marcaId || undefined,
      lineaId: raw.lineaId || undefined,
      unidadMedida: raw.unidadMedida,
      precioVenta: Number(raw.precioVenta),
      costo: Number(raw.costo),
      tipoImpuesto: raw.tipoImpuesto,
      porcentajeImpuesto: raw.tipoImpuesto === 'GRAVADO' ? Number(raw.porcentajeImpuesto) : 0,
      stockInicial: !editingId && stockInicial.length > 0 ? stockInicial : undefined,
    };

    const request$ = editingId
      ? this.productosService.update(editingId, payload, this.selectedImage())
      : this.productosService.create(payload, this.selectedImage());

    request$.subscribe({
      next: () => {
        if (editingId) {
          this.guardarAjustesStock(editingId);
        } else {
          this.finalizarGuardado(editingId);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el producto');
      },
    });
  }

  /** Solo dispara `AJUSTE` para las bodegas cuya cantidad realmente cambió — evita ruido en el kardex. */
  private guardarAjustesStock(productoId: string): void {
    const cambiadas = this.stockEdicion().filter((f) => f.cantidadNueva !== f.cantidadActual);
    if (cambiadas.length === 0) {
      this.finalizarGuardado(productoId);
      return;
    }
    forkJoin(
      cambiadas.map((f) =>
        this.inventarioService.ajustar({
          productoId,
          bodegaId: f.bodegaId,
          tipo: 'AJUSTE',
          cantidad: f.cantidadNueva,
          motivo: 'Editado desde ficha de producto',
        }),
      ),
    ).subscribe({
      next: () => this.finalizarGuardado(productoId),
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'Producto guardado, pero no se pudo actualizar el stock');
      },
    });
  }

  private finalizarGuardado(editingId: string | null): void {
    this.saving.set(false);
    this.showForm.set(false);
    this.toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
    this.load();
  }

  protected eliminar(producto: Producto): void {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
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
