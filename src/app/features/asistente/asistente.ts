import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, tap } from 'rxjs';
import { Topbar } from '../../layout/topbar/topbar';
import { Button } from '../../shared/ui/atoms/button/button';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../shared/ui/atoms/input/input';
import { SearchBar } from '../../shared/ui/molecules/search-bar/search-bar';
import { Switch } from '../../shared/ui/atoms/switch/switch';
import { Stepper, PasoStepper } from '../../shared/ui/molecules/stepper/stepper';
import { ProductoForm } from '../productos/producto-form/producto-form';
import { SucursalesService } from '../../core/services/sucursales.service';
import { BodegasService } from '../../core/services/bodegas.service';
import { ProductosService } from '../../core/services/productos.service';
import { InventarioService, InventarioItem } from '../../core/services/inventario.service';
import { SucursalContextService } from '../../core/services/sucursal-context.service';
import { ToastService } from '../../core/services/toast.service';
import { Sucursal } from '../../core/models/sucursal.model';
import { Bodega } from '../../core/models/bodega.model';
import { Producto } from '../../core/models/producto.model';

type PasoAsistente = 1 | 2 | 3;
/**
 * `paso` = form activo (creación o edición). `resumen` = la bodega activa ya tiene stock cargado —
 * en vez de forzar de nuevo el paso 3 de creación, se muestra un resumen de los 3 pasos con acceso
 * a editar cada uno, en vez de dejar al usuario atrapado repitiendo el alta de productos para siempre.
 */
type VistaAsistente = 'paso' | 'resumen';

/**
 * Asistente de configuración guiada: Sucursal → Bodega → Productos y stock. Orquesta los mismos
 * endpoints que ya usan /sucursales, /bodegas y /productos — no inventa reglas nuevas, solo las
 * ordena en un flujo paso a paso. Resumible: cada vez que se entra, recalcula en qué paso está
 * mirando el estado real (no asume que siempre arranca en el paso 1). Una vez que la bodega activa
 * ya tiene stock cargado, `vista` pasa a `'resumen'` — el paso 3 de creación de productos era para
 * arrancar el catálogo, no para quedarse ahí; de ahí en más, productos se gestiona desde `/productos`.
 */
@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [Topbar, Button, Icon, FormField, Input, SearchBar, Switch, Stepper, ProductoForm, ReactiveFormsModule, FormsModule],
  templateUrl: './asistente.html',
  styleUrl: './asistente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Asistente {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly bodegasService = inject(BodegasService);
  private readonly productosService = inject(ProductosService);
  private readonly inventarioService = inject(InventarioService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly cargando = signal(true);
  protected readonly paso = signal<PasoAsistente>(1);
  protected readonly vista = signal<VistaAsistente>('paso');
  /** `true` mientras se edita una sucursal/bodega ya existente desde el resumen — decide si `guardarSucursal`/`guardarBodega` crean o actualizan. */
  protected readonly editando = signal(false);
  protected readonly pasosStepper: PasoStepper[] = [
    { numero: 1, etiqueta: 'Sucursal' },
    { numero: 2, etiqueta: 'Bodega' },
    { numero: 3, etiqueta: 'Productos y stock' },
  ];

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly sucursalActiva = signal<Sucursal | null>(null);
  /** Sin query param y con más de una sucursal ya existente, no hay forma de adivinar cuál — se pregunta. */
  protected readonly necesitaElegirSucursal = computed(
    () => !this.sucursalActiva() && this.sucursales().length > 1,
  );

  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly bodegaActiva = signal<Bodega | null>(null);
  /** Stock de la bodega activa — decide si se muestra el resumen (ver `verificarBodegaConfigurada`) y cuántos productos mostrar ahí. */
  protected readonly inventarioBodegaActiva = signal<InventarioItem[]>([]);
  /** Para el `ds-stepper`: en el resumen los 3 pasos se ven completos, aunque `paso` internamente siga en 3. */
  protected readonly pasoStepperVisual = computed(() => (this.vista() === 'resumen' ? 4 : this.paso()));

  protected readonly productos = signal<Producto[]>([]);

  protected readonly guardandoSucursal = signal(false);
  protected readonly guardandoBodega = signal(false);
  protected readonly guardandoStock = signal(false);
  protected readonly mostrarNuevoProducto = signal(false);
  /** Switch del form "crear otra bodega" — apagado por defecto para no reemplazar la operativa existente sin querer. */
  protected readonly marcarNuevaComoOperativa = signal(false);

  protected readonly buscarProducto = signal('');
  protected readonly cantidadesAsignar = signal<Map<string, number>>(new Map());

  protected readonly formSucursal = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    metaVentasDiaria: [0],
  });

  protected readonly formBodega = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  /** Si el negocio ya tenía catálogo, siempre se puede finalizar; si arrancó en cero, hay que guardar al menos uno primero (`onProductoCreado` ya suma al mismo signal `productos`). */
  protected readonly puedeFinalizar = computed(() => this.productos().length > 0);

  protected readonly productosFiltrados = computed(() => {
    const term = this.buscarProducto().toLowerCase().trim();
    if (!term) return this.productos();
    return this.productos().filter((p) => p.nombre.toLowerCase().includes(term));
  });

  constructor() {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando.set(true);
    const sucursalIdParam = this.route.snapshot.queryParamMap.get('sucursalId');
    forkJoin({
      sucursales: this.sucursalesService.findAll(),
      productos: this.productosService.findAll(),
    }).subscribe({
      next: ({ sucursales, productos }) => {
        this.sucursales.set(sucursales);
        this.productos.set(productos);

        const sucursal = sucursalIdParam
          ? sucursales.find((s) => s.id === sucursalIdParam)
          : sucursales.length === 1
            ? sucursales[0]
            : undefined;

        if (sucursal) {
          this.activarSucursal(sucursal, false);
        } else {
          this.paso.set(1);
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el estado del asistente');
      },
    });
  }

  private activarSucursal(sucursal: Sucursal, elegirEnContexto: boolean): void {
    this.sucursalActiva.set(sucursal);
    if (elegirEnContexto) {
      this.sucursalContext.elegir(sucursal.id);
    }
    this.bodegasService.findAll().subscribe({
      next: (todas) => {
        const bodegasDeLaSucursal = todas.filter((b) => b.sucursalId === sucursal.id);
        this.bodegas.set(bodegasDeLaSucursal);
        if (bodegasDeLaSucursal.length > 0) {
          const bodega =
            bodegasDeLaSucursal.find((b) => b.id === sucursal.bodegaOperativaId) ?? bodegasDeLaSucursal[0];
          this.bodegaActiva.set(bodega);
          this.paso.set(3);
          this.verificarBodegaConfigurada(bodega.id);
        } else {
          this.vista.set('paso');
          this.paso.set(2);
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar las bodegas');
      },
    });
  }

  /**
   * Si la bodega ya tiene al menos un producto con stock cargado, el paso 3 dejó de tener sentido
   * como pantalla de creación — se muestra el resumen en su lugar (ver `VistaAsistente`).
   */
  private verificarBodegaConfigurada(bodegaId: string): void {
    this.inventarioService.findAll(bodegaId).subscribe({
      next: (items: InventarioItem[]) => {
        this.inventarioBodegaActiva.set(items);
        this.vista.set(items.length > 0 ? 'resumen' : 'paso');
        this.cargando.set(false);
      },
      error: () => {
        // Conservador: si falla la consulta, se comporta como antes (paso 3 de creación).
        this.vista.set('paso');
        this.cargando.set(false);
      },
    });
  }

  /** Público — botón "Ir a Productos" del resumen: de ahí en más, el catálogo se gestiona ahí, no en el asistente. */
  protected irAProductos(): void {
    this.router.navigate(['/productos']);
  }

  protected elegirSucursalExistente(sucursal: Sucursal): void {
    this.cargando.set(true);
    this.activarSucursal(sucursal, true);
  }

  // ---------- Resumen: editar un paso ya configurado ----------

  /** Precarga el form de sucursal con los datos reales y vuelve al paso 1, ahora en modo edición. */
  protected editarSucursal(): void {
    const sucursal = this.sucursalActiva();
    if (!sucursal) return;
    this.formSucursal.reset({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion ?? '',
      telefono: sucursal.telefono ?? '',
      metaVentasDiaria: sucursal.metaVentasDiaria ?? 0,
    });
    this.editando.set(true);
    this.paso.set(1);
    this.vista.set('paso');
  }

  protected editarBodega(): void {
    const bodega = this.bodegaActiva();
    if (!bodega) return;
    this.formBodega.reset({ nombre: bodega.nombre });
    this.editando.set(true);
    this.paso.set(2);
    this.vista.set('paso');
  }

  /** Descarta cualquier cambio sin guardar en el form activo y vuelve al resumen. */
  protected cancelarEdicion(): void {
    this.editando.set(false);
    this.vista.set('resumen');
  }

  private volverAlResumen(): void {
    this.editando.set(false);
    this.vista.set('resumen');
  }

  /** Pide al backend marcar `bodega` como operativa de `sucursal` y, si sale bien, refleja el cambio en el estado local. */
  private actualizarBodegaOperativa(sucursal: Sucursal, bodega: Bodega) {
    return this.sucursalesService.update(sucursal.id, { bodegaOperativaId: bodega.id }).pipe(
      tap((actualizada) => {
        this.sucursalActiva.set(actualizada);
        this.sucursales.update((lista) => lista.map((s) => (s.id === actualizada.id ? actualizada : s)));
      }),
    );
  }

  // ---------- Paso 1: Sucursal ----------

  protected guardarSucursal(): void {
    if (this.formSucursal.invalid) {
      this.formSucursal.markAllAsTouched();
      return;
    }
    const raw = this.formSucursal.getRawValue();
    const payload = {
      nombre: raw.nombre,
      direccion: raw.direccion || undefined,
      telefono: raw.telefono || undefined,
      metaVentasDiaria: raw.metaVentasDiaria || undefined,
    };
    const sucursalAEditar = this.editando() ? this.sucursalActiva() : null;
    this.guardandoSucursal.set(true);

    if (sucursalAEditar) {
      this.sucursalesService.update(sucursalAEditar.id, payload).subscribe({
        next: (sucursal) => {
          this.guardandoSucursal.set(false);
          this.sucursales.update((lista) => lista.map((s) => (s.id === sucursal.id ? sucursal : s)));
          this.sucursalActiva.set(sucursal);
          this.toast.success('Sucursal actualizada');
          this.volverAlResumen();
        },
        error: (err) => {
          this.guardandoSucursal.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo actualizar la sucursal');
        },
      });
      return;
    }

    this.sucursalesService.create(payload).subscribe({
      next: (sucursal) => {
        this.guardandoSucursal.set(false);
        this.sucursales.update((lista) => [...lista, sucursal]);
        this.sucursalContext.elegir(sucursal.id);
        this.sucursalActiva.set(sucursal);
        this.toast.success('Sucursal creada');
        this.paso.set(2);
      },
      error: (err) => {
        this.guardandoSucursal.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la sucursal');
      },
    });
  }

  // ---------- Paso 2: Bodega ----------

  protected guardarBodega(): void {
    if (this.formBodega.invalid) {
      this.formBodega.markAllAsTouched();
      return;
    }
    const sucursal = this.sucursalActiva();
    if (!sucursal) return;
    const nombre = this.formBodega.getRawValue().nombre;
    const bodegaAEditar = this.editando() ? this.bodegaActiva() : null;
    this.guardandoBodega.set(true);

    if (bodegaAEditar) {
      this.bodegasService.update(bodegaAEditar.id, { nombre }).subscribe({
        next: (bodega) => {
          this.guardandoBodega.set(false);
          this.bodegas.update((lista) => lista.map((b) => (b.id === bodega.id ? bodega : b)));
          this.bodegaActiva.set(bodega);
          this.toast.success('Bodega actualizada');
          this.volverAlResumen();
        },
        error: (err) => {
          this.guardandoBodega.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo actualizar la bodega');
        },
      });
      return;
    }

    const eraLaPrimera = !sucursal.bodegaOperativaId;
    this.bodegasService.create({ nombre, sucursalId: sucursal.id }).subscribe({
      next: (bodega) => {
        this.guardandoBodega.set(false);
        this.formBodega.reset({ nombre: '' });
        this.bodegas.update((lista) => [...lista, bodega]);
        this.toast.success('Bodega creada');

        if (eraLaPrimera) {
          // El backend ya la marcó como operativa sola (era la primera de la sucursal) — solo hace falta reflejarlo acá.
          this.sucursalActiva.update((s) => (s ? { ...s, bodegaOperativaId: bodega.id } : s));
          this.bodegaActiva.set(bodega);
          this.paso.set(3);
          this.vista.set('paso');
        } else if (this.marcarNuevaComoOperativa()) {
          this.actualizarBodegaOperativa(sucursal, bodega).subscribe({
            next: () => {
              this.bodegaActiva.set(bodega);
              this.paso.set(3);
              this.vista.set('paso');
            },
            error: () => {
              this.toast.error('No se pudo marcar la bodega como operativa');
              this.vista.set('resumen');
            },
          });
        } else {
          // Bodega adicional sin marcar como operativa — la sucursal sigue operando con la de siempre.
          this.vista.set('resumen');
        }
        this.marcarNuevaComoOperativa.set(false);
      },
      error: (err) => {
        this.guardandoBodega.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la bodega');
      },
    });
  }

  /** No se limpia `bodegaActiva` — así la lista de bodegas puede marcar cuál es la actual mientras se elige otra o se crea una nueva. */
  protected agregarOtraBodega(): void {
    this.marcarNuevaComoOperativa.set(false);
    this.vista.set('paso');
    this.paso.set(2);
  }

  /** Elegir una bodega ya existente de la lista también la marca como operativa — es literalmente decir "de acá en más, opero con esta". */
  protected elegirBodega(bodega: Bodega): void {
    const sucursal = this.sucursalActiva();
    if (sucursal && sucursal.bodegaOperativaId !== bodega.id) {
      this.actualizarBodegaOperativa(sucursal, bodega).subscribe({
        error: () => this.toast.error('No se pudo marcar la bodega como operativa'),
      });
    }
    this.bodegaActiva.set(bodega);
    this.paso.set(3);
    this.verificarBodegaConfigurada(bodega.id);
  }

  // ---------- Paso 3: Productos y stock ----------

  protected cantidadDe(productoId: string): number {
    return this.cantidadesAsignar().get(productoId) ?? 0;
  }

  protected actualizarCantidad(productoId: string, cantidad: number): void {
    this.cantidadesAsignar.update((mapa) => {
      const copia = new Map(mapa);
      copia.set(productoId, Number(cantidad) || 0);
      return copia;
    });
  }

  protected guardarCantidades(): void {
    const bodega = this.bodegaActiva();
    if (!bodega) return;
    const filas = Array.from(this.cantidadesAsignar().entries()).filter(([, cantidad]) => cantidad > 0);
    if (filas.length === 0) {
      this.toast.info('Asigná una cantidad a al menos un producto');
      return;
    }
    this.guardandoStock.set(true);
    forkJoin(
      filas.map(([productoId, cantidad]) =>
        this.inventarioService.ajustar({
          productoId,
          bodegaId: bodega.id,
          tipo: 'ENTRADA',
          cantidad,
          motivo: 'Carga inicial (asistente)',
        }),
      ),
    ).subscribe({
      next: () => {
        this.guardandoStock.set(false);
        this.cantidadesAsignar.set(new Map());
        this.toast.success('Stock asignado');
      },
      error: (err) => {
        this.guardandoStock.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo asignar el stock');
      },
    });
  }

  protected onProductoCreado(producto: Producto): void {
    this.productos.update((lista) => [...lista, producto]);
    this.mostrarNuevoProducto.set(false);
  }

  protected finalizar(): void {
    this.router.navigate(['/dashboard']);
  }
}
