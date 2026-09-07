import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { ImageUpload } from '../../../shared/ui/molecules/image-upload/image-upload';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { Stepper, PasoStepper } from '../../../shared/ui/molecules/stepper/stepper';
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
/** Sentinel para "crear un proveedor nuevo" — nunca colisiona con un UUID real. */
const NUEVO_PROVEEDOR = '__nuevo__';
/** Pasos del wizard de creación — en edición se ignora y se muestra todo en una sola vista. */
const TOTAL_PASOS = 3;

/**
 * Una fila = una bodega con su cantidad inicial y, opcionalmente, el proveedor que la abasteció.
 * El proveedor no queda asociado a la bodega en el modelo de datos (`ProveedorInicialPayload` es
 * a nivel producto, igual que en "Lista de pedidos") — `mostrarProveedor` solo controla si esta
 * fila expone esos campos; al guardar, `guardar()` aplana todas las filas con proveedor cargado
 * en el mismo array plano que ya esperaba el backend.
 */
interface FilaStockInicial {
  bodegaId: string;
  cantidad: number;
  mostrarProveedor: boolean;
  proveedorId: string;
  nombreNuevoProveedor: string;
  costo: number;
  referencia: string;
}

function filaStockVacia(bodegaId: string): FilaStockInicial {
  return { bodegaId, cantidad: 0, mostrarProveedor: false, proveedorId: '', nombreNuevoProveedor: '', costo: 0, referencia: '' };
}

/** Fila para vincular un proveedor a un producto ya existente (edición) — vive aparte de `FilaStockInicial`, pega directo a la API. */
interface FilaProveedorEdicion {
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
  imports: [
    Button,
    Badge,
    Icon,
    FormField,
    Input,
    Select,
    Switch,
    ImageUpload,
    Modal,
    SearchBar,
    Stepper,
    ReactiveFormsModule,
    FormsModule,
  ],
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
  /**
   * En `false` oculta el `ds-stepper` interno del wizard de creación — lo usa el asistente de
   * configuración, que ya envuelve este form en su propio stepper (Sucursal → Bodega → Productos);
   * mostrar los dos apilados se ve redundante. Los pasos y la navegación (`continuar()`/`pasoAnterior()`)
   * siguen funcionando igual, solo cambia si se dibuja o no el indicador visual.
   */
  readonly mostrarStepper = input(true);

  readonly guardado = output<Producto>();

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly proveedoresCatalogo = signal<Proveedor[]>([]);
  protected readonly inventario = signal<InventarioItem[]>([]);
  protected readonly NUEVO_PROVEEDOR = NUEVO_PROVEEDOR;
  /** Una fila por bodega — cantidad inicial y, opcionalmente, el proveedor que la abasteció (ver `FilaStockInicial`). */
  protected readonly filasStockInicial = signal<FilaStockInicial[]>([]);
  /** Proveedores ya vinculados al producto en edición — cada alta/baja pega directo a la API, no se batchea con el guardado. */
  protected readonly proveedoresProducto = signal<ProductoProveedor[]>([]);
  protected readonly cargandoProveedoresProducto = signal(false);
  protected readonly guardandoProveedorProducto = signal(false);
  protected readonly nuevaFilaProveedor = signal<FilaProveedorEdicion>({
    proveedorId: '',
    nombreNuevo: '',
    costo: 0,
    referencia: '',
  });
  protected readonly categoriaIdsSeleccionadas = signal<string[]>([]);
  protected readonly nuevaCategoriaNombre = signal('');
  protected readonly nuevaCategoriaPadreId = signal('');
  protected readonly creandoCategoria = signal(false);
  protected readonly nombreNuevaMarca = signal('');
  protected readonly creandoMarca = signal(false);
  protected readonly nombreNuevaLinea = signal('');
  protected readonly creandoLinea = signal(false);
  /** ¿Mostrar código de barras / SKU? Colapsados por defecto al crear — casi nadie los tiene a mano tecleando a mano. */
  protected readonly mostrarIdentificadores = signal(false);

  // ---------- Modal "Seleccionar categorías" ----------
  protected readonly showCategoriasModal = signal(false);
  protected readonly busquedaCategorias = signal('');
  /** Copia de trabajo mientras el modal está abierto — "Cancelar" no debe tocar la selección real. */
  protected readonly categoriaIdsBorrador = signal<string[]>([]);
  /** El mini-form "+ Crear" arranca oculto — lo abre el botón junto al título del modal. */
  protected readonly mostrarCrearCategoria = signal(false);

  // ---------- Modal "Seleccionar marca y línea" ----------
  protected readonly showMarcaLineaModal = signal(false);
  protected readonly busquedaMarcaLinea = signal('');
  protected readonly mostrarCrearMarca = signal(false);
  protected readonly marcaIdBorrador = signal('');
  protected readonly lineaIdBorrador = signal('');
  /** Marca cuyo mini-form "+ Nueva línea" está abierto dentro del modal (una a la vez). */
  protected readonly marcaCreandoLineaId = signal<string | null>(null);

  /** Wizard de creación — público, lo maneja el botón del host (footer del modal o el del asistente) vía `continuar()`/`pasoAnterior()`. */
  readonly totalPasos = TOTAL_PASOS;
  readonly pasoActual = signal(1);
  readonly pasosStepper: PasoStepper[] = [
    { numero: 1, etiqueta: 'Datos y precio' },
    { numero: 2, etiqueta: 'Clasificación' },
    { numero: 3, etiqueta: 'Stock inicial' },
  ];

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
  /** Público — en edición el host muestra todo en una sola vista, sin wizard (ver `pasoActual`). */
  readonly modoEdicion = computed(() => this.editingId() !== null);

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

  /** Categorías ya elegidas, en el mismo orden jerárquico — lo que se muestra como chips en el resumen del paso 2. */
  protected readonly categoriasSeleccionadasOrdenadas = computed(() =>
    this.categoriasOrdenadas().filter((c) => this.categoriaIdsSeleccionadas().includes(c.id)),
  );

  /** "Marca › Línea" (o solo la marca, o "Sin marca") — lo que se muestra en el resumen del paso 2. */
  protected readonly marcaLineaResumen = () => {
    const marcaId = this.form.controls.marcaId.value;
    const marca = marcaId ? this.marcas().find((m) => m.id === marcaId) : undefined;
    if (!marca) return 'Sin marca';
    const lineaId = this.form.controls.lineaId.value;
    const linea = lineaId ? this.lineas().find((l) => l.id === lineaId) : undefined;
    return linea ? `${marca.nombre} › ${linea.nombre}` : marca.nombre;
  };

  /**
   * Cada marca (en el mismo orden que `marcasOrdenadas`) con sus líneas ya filtradas por
   * `busquedaMarcaLinea` — el modal las pinta como grupo: encabezado de marca + líneas indentadas.
   * Si hay búsqueda, una marca se mantiene visible si su nombre matchea o si tiene alguna línea que
   * matchea (mostrando solo esas líneas); sin búsqueda, se listan todas.
   */
  protected readonly gruposMarcaLinea = () => {
    const termino = this.busquedaMarcaLinea().trim().toLowerCase();
    return this.marcasOrdenadas()
      .map((marca) => {
        const lineasDeEstaMarca = this.lineas().filter((l) => l.marcaId === marca.id);
        if (!termino) return { marca, lineas: lineasDeEstaMarca };
        const marcaMatchea = marca.nombre.toLowerCase().includes(termino);
        return {
          marca,
          lineas: marcaMatchea
            ? lineasDeEstaMarca
            : lineasDeEstaMarca.filter((l) => l.nombre.toLowerCase().includes(termino)),
        };
      })
      .filter(({ marca, lineas }) => !termino || marca.nombre.toLowerCase().includes(termino) || lineas.length > 0);
  };

  /**
   * Categorías filtradas por `busquedaCategorias`, conservando el padre visible si algún hijo
   * matchea (o el hijo si matchea su padre) — mismo criterio de contexto que `gruposMarcaLinea`.
   */
  protected readonly categoriasFiltradas = () => {
    const termino = this.busquedaCategorias().trim().toLowerCase();
    const todas = this.categoriasOrdenadas();
    if (!termino) return todas;
    const idsQueMatchean = new Set(
      this.categorias()
        .filter((c) => c.nombre.toLowerCase().includes(termino))
        .map((c) => c.id),
    );
    return todas.filter((c) => {
      if (idsQueMatchean.has(c.id)) return true;
      if (!c.categoriaPadreId) {
        return this.categorias().some((h) => h.categoriaPadreId === c.id && idsQueMatchean.has(h.id));
      }
      return idsQueMatchean.has(c.categoriaPadreId);
    });
  };

  // ---------- Wizard de creación ----------

  /** Solo el paso 1 bloquea avanzar — el resto del form es opcional (la única regla dura, "al menos una bodega", se valida recién en `guardar()`). */
  protected puedeAvanzar(): boolean {
    if (this.pasoActual() !== 1) return true;
    const { nombre, precioVenta, costo } = this.form.controls;
    return nombre.valid && precioVenta.valid && costo.valid;
  }

  protected siguientePaso(): void {
    if (!this.puedeAvanzar()) {
      this.form.markAllAsTouched();
      return;
    }
    this.pasoActual.update((paso) => Math.min(paso + 1, this.totalPasos));
  }

  /** Público — botón "Atrás" del host. */
  pasoAnterior(): void {
    this.pasoActual.update((paso) => Math.max(paso - 1, 1));
  }

  /**
   * Público — una sola acción para el botón primario del host (y para Enter en cualquier campo):
   * en creación avanza de paso hasta el último, donde guarda; en edición guarda directo.
   */
  continuar(): void {
    if (!this.modoEdicion() && this.pasoActual() < this.totalPasos) {
      this.siguientePaso();
      return;
    }
    this.guardar();
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

  // ---------- Modal "Seleccionar categorías" ----------

  /** Abre el modal con una copia de trabajo — "Cancelar" no debe tocar la selección real. */
  protected abrirModalCategorias(): void {
    this.categoriaIdsBorrador.set([...this.categoriaIdsSeleccionadas()]);
    this.busquedaCategorias.set('');
    this.nuevaCategoriaNombre.set('');
    this.nuevaCategoriaPadreId.set('');
    this.mostrarCrearCategoria.set(false);
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

  /** Crea la categoría y la deja marcada en el borrador — nunca más un dead-end si el negocio arranca en cero. */
  protected crearCategoria(): void {
    const nombre = this.nuevaCategoriaNombre().trim();
    if (!nombre) return;
    this.creandoCategoria.set(true);
    this.categoriasService.create({ nombre, categoriaPadreId: this.nuevaCategoriaPadreId() || undefined }).subscribe({
      next: (categoria) => {
        this.categorias.update((actuales) => [...actuales, categoria]);
        this.categoriaIdsBorrador.update((ids) => [...ids, categoria.id]);
        this.nuevaCategoriaNombre.set('');
        this.nuevaCategoriaPadreId.set('');
        this.mostrarCrearCategoria.set(false);
        this.creandoCategoria.set(false);
      },
      error: (err) => {
        this.creandoCategoria.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la categoría');
      },
    });
  }

  // ---------- Modal "Seleccionar marca y línea" ----------

  protected abrirModalMarcaLinea(): void {
    this.marcaIdBorrador.set(this.form.controls.marcaId.value);
    this.lineaIdBorrador.set(this.form.controls.lineaId.value);
    this.busquedaMarcaLinea.set('');
    this.nombreNuevaMarca.set('');
    this.mostrarCrearMarca.set(false);
    this.marcaCreandoLineaId.set(null);
    this.nombreNuevaLinea.set('');
    this.showMarcaLineaModal.set(true);
  }

  /** Elegir la marca "pelada" (sin línea específica) — limpia cualquier línea que hubiera quedado del borrador. */
  protected elegirMarcaBorrador(marcaId: string): void {
    this.marcaIdBorrador.set(marcaId);
    this.lineaIdBorrador.set('');
  }

  protected elegirLineaBorrador(marcaId: string, lineaId: string): void {
    this.marcaIdBorrador.set(marcaId);
    this.lineaIdBorrador.set(lineaId);
  }

  protected quitarMarcaBorrador(): void {
    this.marcaIdBorrador.set('');
    this.lineaIdBorrador.set('');
  }

  protected guardarSeleccionMarcaLinea(): void {
    this.form.controls.marcaId.setValue(this.marcaIdBorrador());
    this.form.controls.lineaId.setValue(this.lineaIdBorrador());
    this.showMarcaLineaModal.set(false);
  }

  /** Crea la marca y la deja elegida en el borrador (sin línea todavía, no tiene ninguna). */
  protected crearMarca(): void {
    const nombre = this.nombreNuevaMarca().trim();
    if (!nombre) return;
    this.creandoMarca.set(true);
    this.marcasService.create({ nombre }).subscribe({
      next: (marca) => {
        this.marcas.update((actuales) => [...actuales, marca]);
        this.elegirMarcaBorrador(marca.id);
        this.nombreNuevaMarca.set('');
        this.mostrarCrearMarca.set(false);
        this.creandoMarca.set(false);
      },
      error: (err) => {
        this.creandoMarca.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la marca');
      },
    });
  }

  /** Abre el mini-form "+ Nueva línea" para una marca puntual del listado (uno a la vez). */
  protected abrirCrearLineaPara(marcaId: string): void {
    this.marcaCreandoLineaId.set(marcaId);
    this.nombreNuevaLinea.set('');
  }

  protected crearLinea(marcaId: string): void {
    const nombre = this.nombreNuevaLinea().trim();
    if (!nombre) return;
    this.creandoLinea.set(true);
    this.lineasService.create(marcaId, nombre).subscribe({
      next: (linea) => {
        this.lineas.update((actuales) => [...actuales, linea]);
        this.elegirLineaBorrador(marcaId, linea.id);
        this.nombreNuevaLinea.set('');
        this.marcaCreandoLineaId.set(null);
        this.creandoLinea.set(false);
      },
      error: (err) => {
        this.creandoLinea.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la línea');
      },
    });
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

  protected actualizarNuevaFilaProveedor(cambios: Partial<FilaProveedorEdicion>): void {
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
          this.nuevaFilaProveedor.set({ proveedorId: '', nombreNuevo: '', costo: this.costoActual(), referencia: '' });
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
    const bodegaLibre = this.bodegas().find((b) => !this.filasStockInicial().some((f) => f.bodegaId === b.id));
    if (!bodegaLibre) {
      this.toast.info('Ya agregaste todas las bodegas disponibles');
      return;
    }
    this.filasStockInicial.update((filas) => [...filas, filaStockVacia(bodegaLibre.id)]);
  }

  protected actualizarFilaStock(index: number, cambios: Partial<FilaStockInicial>): void {
    this.filasStockInicial.update((filas) => filas.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }

  protected quitarFilaStock(index: number): void {
    this.filasStockInicial.update((filas) => filas.filter((_, i) => i !== index));
  }

  /**
   * Precarga el costo del proveedor con el "Costo" ya cargado en el paso 1 — lo normal es que el
   * primer proveedor que se vincula sea justamente de dónde salió ese costo. Sigue siendo editable
   * por fila: si un proveedor puntual cobra distinto, se sobreescribe ahí mismo sin afectar a los demás.
   */
  protected mostrarProveedorEnFila(index: number): void {
    this.actualizarFilaStock(index, { mostrarProveedor: true, costo: this.costoActual() });
  }

  /** Colapsa la sub-fila de proveedor y limpia lo que se hubiera cargado, para no mandar basura al guardar. */
  protected ocultarProveedorDeFila(index: number): void {
    this.actualizarFilaStock(index, { mostrarProveedor: false, proveedorId: '', nombreNuevoProveedor: '', costo: 0, referencia: '' });
  }

  /** Costo cargado en el paso 1 — default para precargar el costo de un proveedor recién vinculado. */
  protected costoActual(): number {
    return Number(this.form.controls.costo.value) || 0;
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
    this.pasoActual.set(1);
    this.mostrarIdentificadores.set(false);
    const bodegaId = this.bodegaSugerida();
    this.filasStockInicial.set(bodegaId ? [filaStockVacia(bodegaId)] : []);
    this.stockEdicion.set([]);
    this.categoriaIdsSeleccionadas.set([]);
    this.nuevaCategoriaNombre.set('');
    this.nombreNuevaMarca.set('');
    this.nombreNuevaLinea.set('');
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
    this.mostrarIdentificadores.set(!!(producto.codigoBarras || producto.sku));
    this.filasStockInicial.set([]);
    this.proveedoresProducto.set([]);
    this.nuevaFilaProveedor.set({ proveedorId: '', nombreNuevo: '', costo: producto.costo, referencia: '' });
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

  /** Público — el host dispara el guardado desde su propio botón (footer del modal, o el del asistente), normalmente vía `continuar()`. */
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const editingId = this.editingId();
    const stockInicial: StockInicialPayload[] = this.filasStockInicial()
      .filter((f) => f.bodegaId && f.cantidad >= 0)
      .map((f) => ({ bodegaId: f.bodegaId, cantidad: f.cantidad }));
    if (!editingId && stockInicial.length === 0) {
      this.toast.error('Asigná al menos una bodega con stock inicial — puede ser 0');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const proveedores: ProveedorInicialPayload[] = this.filasStockInicial()
      .filter(
        (f) =>
          f.mostrarProveedor &&
          f.proveedorId &&
          f.costo > 0 &&
          (f.proveedorId !== NUEVO_PROVEEDOR || f.nombreNuevoProveedor.trim()),
      )
      .map((f) => ({
        proveedorId: f.proveedorId === NUEVO_PROVEEDOR ? undefined : f.proveedorId,
        proveedorNuevo: f.proveedorId === NUEVO_PROVEEDOR ? { nombre: f.nombreNuevoProveedor.trim() } : undefined,
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
    const stockInicial = this.filasStockInicial().filter((f) => f.bodegaId && f.cantidad > 0);
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
