import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../layout/topbar/topbar';
import { Button } from '../../shared/ui/atoms/button/button';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../shared/ui/atoms/input/input';
import { SearchBar } from '../../shared/ui/molecules/search-bar/search-bar';
import { Stepper, PasoStepper } from '../../shared/ui/molecules/stepper/stepper';
import { ProductoForm } from '../productos/producto-form/producto-form';
import { SucursalesService } from '../../core/services/sucursales.service';
import { BodegasService } from '../../core/services/bodegas.service';
import { ProductosService } from '../../core/services/productos.service';
import { InventarioService } from '../../core/services/inventario.service';
import { SucursalContextService } from '../../core/services/sucursal-context.service';
import { ToastService } from '../../core/services/toast.service';
import { Sucursal } from '../../core/models/sucursal.model';
import { Bodega } from '../../core/models/bodega.model';
import { Producto } from '../../core/models/producto.model';

type PasoAsistente = 1 | 2 | 3;

/**
 * Asistente de configuración guiada: Sucursal → Bodega → Productos y stock. Orquesta los mismos
 * endpoints que ya usan /sucursales, /bodegas y /productos — no inventa reglas nuevas, solo las
 * ordena en un flujo paso a paso. Resumible: cada vez que se entra, recalcula en qué paso está
 * mirando el estado real (no asume que siempre arranca en el paso 1).
 */
@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [Topbar, Button, Icon, FormField, Input, SearchBar, Stepper, ProductoForm, ReactiveFormsModule, FormsModule],
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

  protected readonly productos = signal<Producto[]>([]);

  protected readonly guardandoSucursal = signal(false);
  protected readonly guardandoBodega = signal(false);
  protected readonly guardandoStock = signal(false);
  protected readonly mostrarNuevoProducto = signal(false);

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
          this.bodegaActiva.set(bodegasDeLaSucursal[0]);
          this.paso.set(3);
        } else {
          this.paso.set(2);
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar las bodegas');
      },
    });
  }

  protected elegirSucursalExistente(sucursal: Sucursal): void {
    this.cargando.set(true);
    this.activarSucursal(sucursal, true);
  }

  // ---------- Paso 1: Sucursal ----------

  protected guardarSucursal(): void {
    if (this.formSucursal.invalid) {
      this.formSucursal.markAllAsTouched();
      return;
    }
    this.guardandoSucursal.set(true);
    const raw = this.formSucursal.getRawValue();
    this.sucursalesService
      .create({
        nombre: raw.nombre,
        direccion: raw.direccion || undefined,
        telefono: raw.telefono || undefined,
        metaVentasDiaria: raw.metaVentasDiaria || undefined,
      })
      .subscribe({
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
    this.guardandoBodega.set(true);
    this.bodegasService.create({ nombre: this.formBodega.getRawValue().nombre, sucursalId: sucursal.id }).subscribe({
      next: (bodega) => {
        this.guardandoBodega.set(false);
        this.formBodega.reset({ nombre: '' });
        this.bodegas.update((lista) => [...lista, bodega]);
        this.bodegaActiva.set(bodega);
        this.toast.success('Bodega creada');
        this.paso.set(3);
      },
      error: (err) => {
        this.guardandoBodega.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo crear la bodega');
      },
    });
  }

  protected agregarOtraBodega(): void {
    this.bodegaActiva.set(null);
    this.paso.set(2);
  }

  protected elegirBodega(bodega: Bodega): void {
    this.bodegaActiva.set(bodega);
    this.paso.set(3);
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
