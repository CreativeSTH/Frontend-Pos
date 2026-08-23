import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { ImageUpload } from '../../../shared/ui/molecules/image-upload/image-upload';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { MarcasService } from '../../../core/services/marcas.service';
import { LineasService } from '../../../core/services/lineas.service';
import { InventarioItem, InventarioService } from '../../../core/services/inventario.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { Producto, ProveedorInicialPayload, StockInicialPayload, TipoImpuesto } from '../../../core/models/producto.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Marca } from '../../../core/models/marca.model';
import { Linea } from '../../../core/models/linea.model';
import { Bodega } from '../../../core/models/bodega.model';
import { ProductoProveedor, Proveedor } from '../../../core/models/proveedor.model';
import { environment } from '../../../../environments/environment';

/** Umbral de alerta de stock bajo cuando no se personaliza al crear/editar un producto. */
const STOCK_MINIMO_DEFAULT = 2;
/** Sentinel para "crear un proveedor nuevo" dentro de una fila de proveedor — nunca colisiona con un UUID real. */
const NUEVO_PROVEEDOR = '__nuevo__';

interface FilaProveedorInicial {
  proveedorId: string;
  nombreNuevo: string;
  costo: number;
  referencia: string;
}

/**
 * Formulario de creación/edición de producto — extraído de `productos-list.ts` para poder
 * reusarlo tal cual desde el asistente de configuración (`features/asistente/`), que lo embebe
 * sin el `<ds-modal>` que lo envuelve en `/productos`. Autocontenido: carga sus propios maestros
 * (categorías, marcas, líneas, bodegas, proveedores) en vez de recibirlos por input, así cualquier
 * pantalla lo puede usar con una sola etiqueta.
 */
@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [Button, Badge, Icon, Modal, FormField, Input, Select, Switch, ImageUpload, ReactiveFormsModule, FormsModule],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoForm implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly marcasService = inject(MarcasService);
  private readonly lineasService = inject(LineasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly bodegasService = inject(BodegasService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly alertasService = inject(AlertasService);
  private readonly fb = inject(FormBuilder);

  /** Si viene seteado, el formulario arranca en modo edición con estos datos. */
  readonly producto = input<Producto | null>(null);
  /** Bodega a precargar en la primera fila de stock inicial (asistente: la bodega recién creada). */
  readonly bodegaSugerida = input<string | undefined>(undefined);
  /**
   * Si es `true`, tras guardar en modo creación el formulario se limpia solo para cargar otro
   * producto en vez de quedar con los datos ya guardados — usado por el asistente ("Guardar y
   * agregar otro"). En `/productos` queda en `false`: el modal se cierra desde afuera al recibir
   * `guardado`.
   */
  readonly permitirVarios = input(false);

  readonly guardado = output<Producto>();

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly proveedoresCatalogo = signal<Proveedor[]>([]);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly stockInicial = signal<StockInicialPayload[]>([]);
  protected readonly NUEVO_PROVEEDOR = NUEVO_PROVEEDOR;
  /** Filas de proveedor a vincular al crear el producto (patrón calcado de stockInicial). */
  protected readonly proveedoresInicial = signal<FilaProveedorInicial[]>([]);
  /** Proveedores ya vinculados al producto en edición — cada alta/baja pega directo a la API, no se batchea con el guardado. */
  protected readonly proveedoresProducto = signal<ProductoProveedor[]>([]);
  protected readonly cargandoProveedoresProducto = signal(false);
  protected readonly guardandoProveedorProducto = signal(false);
  protected readonly nuevaFilaProveedor = signal<FilaProveedorInicial>({
    proveedorId: '',
    nombreNuevo: '',
    costo: 0,
    referencia: '',
  });
  protected readonly categoriaIdsSeleccionadas = signal<string[]>([]);
  protected readonly showCategoriasModal = signal(false);
  /** Copia de trabajo mientras el modal de selección está abierto — ver `abrirSeleccionCategorias`. */
  protected readonly categoriaIdsBorrador = signal<string[]>([]);

  /** Bodega + cantidad actual/nueva al editar un producto ya existente — ver `guardarAjustesStock()`. */
  protected readonly stockEdicion = signal<{ bodegaId: string; cantidadActual: number; cantidadNueva: number }[]>([]);

  /** Umbral de alerta de stock bajo — si no se personaliza, el default es 2 (ver `guardarStockMinimoInicial`). */
  protected readonly stockMinimoPersonalizado = signal(false);
  protected readonly stockMinimoValor = signal(2);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagenUrl = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  /** Público — el host (modal de `/productos` o el asistente) dispara el guardado desde su propio botón. */
  readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    codigoBarras: [''],
    sku: [''],
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

  /** Categorías ya elegidas, en el mismo orden jerárquico que `categoriasOrdenadas` — lo que se muestra como chips en el form principal. */
  protected readonly categoriasSeleccionadasOrdenadas = computed(() =>
    this.categoriasOrdenadas().filter((c) => this.categoriaIdsSeleccionadas().includes(c.id)),
  );

  protected readonly lineasDeMarca = () => {
    const marcaId = this.form.controls.marcaId.value;
    if (!marcaId) return [];
    return this.lineas().filter((l) => l.marcaId === marcaId);
  };

  constructor() {
    this.form.controls.marcaId.valueChanges.subscribe((marcaId) => {
      const lineaActual = this.lineas().find((l) => l.id === this.form.controls.lineaId.value);
      if (lineaActual && lineaActual.marcaId !== marcaId) {
        this.form.controls.lineaId.setValue('');
      }
    });
  }

  ngOnInit(): void {
    const producto = this.producto();
    if (producto) {
      this.inicializarEdicion(producto);
    } else {
      this.inicializarCreacion();
    }
    this.cargarMaestros(producto);
  }

  /**
   * `bodegas`/`inventario` llegan async — las filas de `stockEdicion` (modo edición) dependen de
   * las dos, así que se calculan recién cuando ambas resuelven, no en `inicializarEdicion()` (que
   * corre síncrono en `ngOnInit`, antes de que cualquier maestro haya llegado).
   */
  private cargarMaestros(producto: Producto | null): void {
    this.categoriasService.findAll().subscribe((data) => this.categorias.set(data));
    this.marcasService.findAll().subscribe((data) => this.marcas.set(data));
    this.lineasService.findAll().subscribe((data) => this.lineas.set(data));
    this.proveedoresService.findAll().subscribe((data) => this.proveedoresCatalogo.set(data));

    forkJoin({
      bodegas: this.bodegasService.findAll(),
      inventario: this.inventarioService.findAll(),
    }).subscribe(({ bodegas, inventario }) => {
      this.bodegas.set(bodegas);
      this.inventario.set(inventario);
      if (producto) {
        this.stockEdicion.set(
          bodegas.map((bodega) => {
            const cantidadActual = Number(
              inventario.find((i) => i.productoId === producto.id && i.bodegaId === bodega.id)?.cantidad ?? 0,
            );
            return { bodegaId: bodega.id, cantidadActual, cantidadNueva: cantidadActual };
          }),
        );
      }
    });
  }

  // ---------- Categorías ----------

  /** Abre el modal grande de selección con una copia de trabajo — "Cancelar" no debe tocar la selección real. */
  protected abrirSeleccionCategorias(): void {
    this.categoriaIdsBorrador.set([...this.categoriaIdsSeleccionadas()]);
    this.showCategoriasModal.set(true);
  }

  protected alternarCategoriaBorrador(id: string, seleccionada: boolean): void {
    this.categoriaIdsBorrador.update((actuales) =>
      seleccionada ? [...actuales, id] : actuales.filter((c) => c !== id),
    );
  }

  protected guardarSeleccionCategorias(): void {
    this.categoriaIdsSeleccionadas.set(this.categoriaIdsBorrador());
    this.showCategoriasModal.set(false);
  }

  // ---------- Proveedores: filas al crear ----------

  protected agregarFilaProveedor(): void {
    this.proveedoresInicial.update((filas) => [
      ...filas,
      { proveedorId: '', nombreNuevo: '', costo: 0, referencia: '' },
    ]);
  }

  protected actualizarFilaProveedor(index: number, cambios: Partial<FilaProveedorInicial>): void {
    this.proveedoresInicial.update((filas) => filas.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }

  protected quitarFilaProveedor(index: number): void {
    this.proveedoresInicial.update((filas) => filas.filter((_, i) => i !== index));
  }

  // ---------- Proveedores: vínculo en vivo al editar ----------

  private cargarProveedoresProducto(productoId: string): void {
    this.cargandoProveedoresProducto.set(true);
    this.proveedoresService.porProducto(productoId).subscribe({
      next: (vinculos) => {
        this.proveedoresProducto.set(vinculos);
        this.cargandoProveedoresProducto.set(false);
      },
      error: () => {
        this.cargandoProveedoresProducto.set(false);
        this.toast.error('No se pudieron cargar los proveedores del producto');
      },
    });
  }

  protected actualizarNuevaFilaProveedor(cambios: Partial<FilaProveedorInicial>): void {
    this.nuevaFilaProveedor.update((fila) => ({ ...fila, ...cambios }));
  }

  protected agregarProveedorAProducto(): void {
    const productoId = this.editingId();
    const fila = this.nuevaFilaProveedor();
    if (!productoId) return;
    if (!fila.proveedorId) {
      this.toast.error('Elegí un proveedor');
      return;
    }
    if (fila.proveedorId === NUEVO_PROVEEDOR && !fila.nombreNuevo.trim()) {
      this.toast.error('Escribí el nombre del nuevo proveedor');
      return;
    }
    if (!(fila.costo > 0)) {
      this.toast.error('El costo debe ser mayor a 0');
      return;
    }

    this.guardandoProveedorProducto.set(true);
    this.proveedoresService
      .vincularProducto(productoId, {
        proveedorId: fila.proveedorId === NUEVO_PROVEEDOR ? undefined : fila.proveedorId,
        proveedorNuevo: fila.proveedorId === NUEVO_PROVEEDOR ? { nombre: fila.nombreNuevo.trim() } : undefined,
        costo: fila.costo,
        referencia: fila.referencia || undefined,
      })
      .subscribe({
        next: () => {
          this.guardandoProveedorProducto.set(false);
          this.nuevaFilaProveedor.set({ proveedorId: '', nombreNuevo: '', costo: 0, referencia: '' });
          this.cargarProveedoresProducto(productoId);
          this.proveedoresService.findAll().subscribe((data) => this.proveedoresCatalogo.set(data));
          this.toast.success('Proveedor vinculado');
        },
        error: (err) => {
          this.guardandoProveedorProducto.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo vincular el proveedor');
        },
      });
  }

  protected async quitarProveedorDeProducto(vinculo: ProductoProveedor): Promise<void> {
    const productoId = this.editingId();
    if (!productoId) return;
    if (
      !(await this.confirmService.ask({
        message: `¿Quitar "${vinculo.proveedor?.nombre}" como proveedor de este producto?`,
        danger: true,
      }))
    ) {
      return;
    }
    this.proveedoresService.desvincularProducto(productoId, vinculo.proveedorId).subscribe({
      next: () => {
        this.proveedoresProducto.update((lista) => lista.filter((v) => v.id !== vinculo.id));
        this.toast.success('Proveedor desvinculado');
      },
      error: () => this.toast.error('No se pudo desvincular el proveedor'),
    });
  }

  // ---------- Stock inicial (creación) ----------

  protected agregarFilaStock(): void {
    if (this.bodegas().length === 0) {
      this.toast.error('Creá una bodega antes de asignar stock a un producto');
      return;
    }
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

  protected actualizarStockEdicion(index: number, cantidadNueva: number): void {
    this.stockEdicion.update((filas) => filas.map((f, i) => (i === index ? { ...f, cantidadNueva } : f)));
  }

  protected nombreBodega(bodegaId: string): string {
    return this.bodegas().find((b) => b.id === bodegaId)?.nombre ?? '—';
  }

  // ---------- Inicialización ----------

  private inicializarCreacion(): void {
    this.editingId.set(null);
    this.editingImagenUrl.set(null);
    this.selectedImage.set(null);
    const bodegaId = this.bodegaSugerida();
    this.stockInicial.set(bodegaId ? [{ bodegaId, cantidad: 0 }] : []);
    this.stockEdicion.set([]);
    this.categoriaIdsSeleccionadas.set([]);
    this.proveedoresInicial.set([]);
    this.proveedoresProducto.set([]);
    this.stockMinimoPersonalizado.set(false);
    this.stockMinimoValor.set(STOCK_MINIMO_DEFAULT);
    this.form.reset({
      nombre: '',
      codigoBarras: '',
      sku: '',
      marcaId: '',
      lineaId: '',
      unidadMedida: 'UNIDAD',
      precioVenta: 0,
      costo: 0,
      tipoImpuesto: 'GRAVADO',
      porcentajeImpuesto: 19,
    });
  }

  private inicializarEdicion(producto: Producto): void {
    this.editingId.set(producto.id);
    this.editingImagenUrl.set(this.imageUrl(producto.imagenUrl));
    this.selectedImage.set(null);
    this.stockInicial.set([]);
    this.proveedoresInicial.set([]);
    this.proveedoresProducto.set([]);
    this.nuevaFilaProveedor.set({ proveedorId: '', nombreNuevo: '', costo: 0, referencia: '' });
    this.cargarProveedoresProducto(producto.id);
    this.stockMinimoPersonalizado.set(false);
    this.stockMinimoValor.set(STOCK_MINIMO_DEFAULT);
    this.categoriaIdsSeleccionadas.set(producto.categorias.map((c) => c.id));
    // stockEdicion se calcula en cargarMaestros() una vez que bodegas+inventario resuelven.
    this.form.reset({
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras ?? '',
      sku: producto.sku ?? '',
      marcaId: producto.marcaId ?? '',
      lineaId: producto.lineaId ?? '',
      unidadMedida: producto.unidadMedida,
      precioVenta: producto.precioVenta,
      costo: producto.costo,
      tipoImpuesto: producto.tipoImpuesto,
      porcentajeImpuesto: producto.porcentajeImpuesto,
    });
  }

  // ---------- Guardado ----------

  /** Público — el host dispara el guardado desde su propio botón (footer del modal, o el del asistente). */
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const editingId = this.editingId();
    const stockInicial = this.stockInicial().filter((s) => s.bodegaId && s.cantidad >= 0);
    if (!editingId && stockInicial.length === 0) {
      this.toast.error('Asigná al menos una bodega con stock inicial — puede ser 0');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const proveedores: ProveedorInicialPayload[] = this.proveedoresInicial()
      .filter((f) => f.proveedorId && f.costo > 0 && (f.proveedorId !== NUEVO_PROVEEDOR || f.nombreNuevo.trim()))
      .map((f) => ({
        proveedorId: f.proveedorId === NUEVO_PROVEEDOR ? undefined : f.proveedorId,
        proveedorNuevo: f.proveedorId === NUEVO_PROVEEDOR ? { nombre: f.nombreNuevo.trim() } : undefined,
        costo: f.costo,
        referencia: f.referencia || undefined,
      }));
    const payload = {
      nombre: raw.nombre,
      codigoBarras: raw.codigoBarras || undefined,
      sku: raw.sku || undefined,
      categoriaIds: this.categoriaIdsSeleccionadas(),
      marcaId: raw.marcaId || undefined,
      lineaId: raw.lineaId || undefined,
      unidadMedida: raw.unidadMedida,
      precioVenta: Number(raw.precioVenta),
      costo: Number(raw.costo),
      tipoImpuesto: raw.tipoImpuesto,
      porcentajeImpuesto: raw.tipoImpuesto === 'GRAVADO' ? Number(raw.porcentajeImpuesto) : 0,
      stockInicial: !editingId && stockInicial.length > 0 ? stockInicial : undefined,
      proveedores: !editingId && proveedores.length > 0 ? proveedores : undefined,
    };

    const request$ = editingId
      ? this.productosService.update(editingId, payload, this.selectedImage())
      : this.productosService.create(payload, this.selectedImage());

    request$.subscribe({
      next: (producto) => {
        if (editingId) {
          this.guardarAjustesStock(producto, editingId);
        } else {
          this.guardarStockMinimoInicial(producto);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el producto');
      },
    });
  }

  /** Solo dispara `AJUSTE` para las bodegas cuya cantidad realmente cambió — evita ruido en el kardex. */
  private guardarAjustesStock(producto: Producto, productoId: string): void {
    const llamadas = this.stockEdicion()
      .filter((f) => f.cantidadNueva !== f.cantidadActual)
      .map((f) =>
        this.inventarioService.ajustar({
          productoId,
          bodegaId: f.bodegaId,
          tipo: 'AJUSTE',
          cantidad: f.cantidadNueva,
          motivo: 'Editado desde ficha de producto',
        }),
      );
    // El switch de stock mínimo es opt-in en edición — si no se activa, no se toca
    // lo que ya hubiera configurado (evita pisar un ajuste fino hecho desde Inventario).
    if (this.stockMinimoPersonalizado()) {
      const valor = this.stockMinimoValor();
      for (const fila of this.stockEdicion()) {
        llamadas.push(this.inventarioService.setStockMinimo(productoId, fila.bodegaId, valor));
      }
    }
    if (llamadas.length === 0) {
      this.finalizarGuardado(producto, true);
      return;
    }
    forkJoin(llamadas).subscribe({
      next: () => this.finalizarGuardado(producto, true),
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'Producto guardado, pero no se pudo actualizar el stock');
      },
    });
  }

  /** En creación, cada bodega con stock inicial recibe el mínimo personalizado o el default (2). */
  private guardarStockMinimoInicial(producto: Producto): void {
    const stockInicial = this.stockInicial().filter((s) => s.bodegaId && s.cantidad > 0);
    if (stockInicial.length === 0) {
      this.finalizarGuardado(producto, false);
      return;
    }
    const valor = this.stockMinimoPersonalizado() ? this.stockMinimoValor() : STOCK_MINIMO_DEFAULT;
    forkJoin(
      stockInicial.map((s) => this.inventarioService.setStockMinimo(producto.id, s.bodegaId, valor)),
    ).subscribe({
      next: () => this.finalizarGuardado(producto, false),
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'Producto creado, pero no se pudo definir el stock mínimo');
      },
    });
  }

  private finalizarGuardado(producto: Producto, esEdicion: boolean): void {
    this.saving.set(false);
    this.toast.success(esEdicion ? 'Producto actualizado' : 'Producto creado');
    // Si el guardado tocó stock, el backend ya generó la alerta correspondiente (si aplica) —
    // se refresca acá para que la campana no espere el poll de 30s.
    this.alertasService.refrescarConteo().subscribe();
    if (!esEdicion && this.permitirVarios()) {
      this.inicializarCreacion();
    }
    this.guardado.emit(producto);
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
