import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { LineasService } from '../../../core/services/lineas.service';
import { InventarioService } from '../../../core/services/inventario.service';
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
  protected readonly stockPorProducto = signal<Map<string, number>>(new Map());
  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagenUrl = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    codigoBarras: [''],
    categoriaId: [''],
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

  protected nombreCategoria(id?: string): string {
    if (!id) return '—';
    return this.categorias().find((c) => c.id === id)?.nombre ?? '—';
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
    this.form.reset({
      nombre: '',
      codigoBarras: '',
      categoriaId: '',
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
    this.form.reset({
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras ?? '',
      categoriaId: producto.categoriaId ?? '',
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
      categoriaId: raw.categoriaId || undefined,
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
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el producto');
      },
    });
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
