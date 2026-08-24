import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Stepper, PasoStepper } from '../../../shared/ui/molecules/stepper/stepper';
import { CuponesService } from '../../../core/services/cupones.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { ProductosService } from '../../../core/services/productos.service';
import { ToastService } from '../../../core/services/toast.service';
import { PromocionPayload, TipoDescuento, TipoPromocion } from '../../../core/models/promocion.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Bodega } from '../../../core/models/bodega.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Producto } from '../../../core/models/producto.model';

type PasoWizard = 1 | 2 | 3 | 4 | 5;
type Dimension = 'sucursales' | 'bodegas' | 'categorias' | 'productos';
type Opcion = { id: string; nombre: string };

const ETIQUETAS_DIMENSION: Record<Dimension, string> = {
  sucursales: 'Sucursales',
  bodegas: 'Bodegas',
  categorias: 'Categorías',
  productos: 'Productos',
};

/**
 * Crear/editar un cupón o promoción — mismo patrón de wizard que
 * `features/facturacion/facturacion-wizard` y `features/graficos/graficos-wizard`:
 * un componente, `paso = signal<N>(1)`, avance explícito por paso.
 */
@Component({
  selector: 'app-cupones-wizard',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, FormField, Input, Select, Switch, Modal, Stepper, ReactiveFormsModule, FormsModule],
  templateUrl: './cupones-wizard.html',
  styleUrl: './cupones-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponesWizard {
  private readonly cuponesService = inject(CuponesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly bodegasService = inject(BodegasService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly productosService = inject(ProductosService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly paso = signal<PasoWizard>(1);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly activo = signal(true);

  protected readonly pasos: PasoStepper[] = [
    { numero: 1, etiqueta: 'Tipo' },
    { numero: 2, etiqueta: 'Descuento' },
    { numero: 3, etiqueta: 'Alcance' },
    { numero: 4, etiqueta: 'Límites' },
    { numero: 5, etiqueta: 'Revisar' },
  ];

  protected readonly formPrincipal = this.fb.nonNullable.group({
    tipo: ['PROMOCION' as TipoPromocion, Validators.required],
    nombre: ['', Validators.required],
    descripcion: [''],
    codigo: [''],
  });

  protected readonly formDescuento = this.fb.nonNullable.group({
    tipoDescuento: ['PORCENTAJE' as TipoDescuento, Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    montoMinimoCompra: [null as number | null],
  });

  protected readonly formLimites = this.fb.nonNullable.group({
    fechaInicio: [''],
    horaInicio: [''],
    fechaFin: [''],
    horaFin: [''],
    usoMaximo: [null as number | null],
  });

  protected readonly dimensiones: Dimension[] = ['sucursales', 'bodegas', 'categorias', 'productos'];
  protected readonly etiquetasDimension = ETIQUETAS_DIMENSION;

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  protected readonly seleccion = signal<Record<Dimension, Set<string>>>({
    sucursales: new Set(),
    bodegas: new Set(),
    categorias: new Set(),
    productos: new Set(),
  });
  protected readonly alcanceEditando = signal<Dimension | null>(null);
  /** Copia de trabajo mientras el modal de selección está abierto — "Cancelar" no debe tocar la selección real. */
  protected readonly borrador = signal<Set<string>>(new Set());

  constructor() {
    this.cargar();
  }

  /**
   * Método plano (no signal/computed) a propósito: `formPrincipal.controls.tipo` es un
   * `FormControl` de Reactive Forms, no un signal, así que `computed()` nunca detectaría sus
   * cambios. Los eventos de los form directives sí marcan el componente para re-chequeo (incluso
   * con OnPush), así que llamarlo directo desde el template alcanza — mismo criterio ya usado en
   * `FacturacionWizard.esFactura()`.
   */
  protected esCupon(): boolean {
    return this.formPrincipal.controls.tipo.value === 'CUPON';
  }

  private cargar(): void {
    const promocionId = this.route.snapshot.queryParamMap.get('promocionId');
    this.editandoId.set(promocionId);

    forkJoin({
      sucursales: this.sucursalesService.findAll(),
      bodegas: this.bodegasService.findAll(),
      categorias: this.categoriasService.findAll(),
      productos: this.productosService.findAll(),
    }).subscribe({
      next: ({ sucursales, bodegas, categorias, productos }) => {
        this.sucursales.set(sucursales);
        this.bodegas.set(bodegas);
        this.categorias.set(categorias);
        this.productos.set(productos);
        if (promocionId) {
          this.cargarExistente(promocionId);
        } else {
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la información necesaria');
      },
    });
  }

  private cargarExistente(id: string): void {
    this.cuponesService.findOne(id).subscribe({
      next: (promocion) => {
        this.formPrincipal.setValue({
          tipo: promocion.tipo,
          nombre: promocion.nombre,
          descripcion: promocion.descripcion ?? '',
          codigo: promocion.codigo ?? '',
        });
        this.formDescuento.setValue({
          tipoDescuento: promocion.tipoDescuento,
          valor: promocion.valor,
          montoMinimoCompra: promocion.montoMinimoCompra ?? null,
        });
        const inicio = this.splitFechaHora(promocion.fechaInicio);
        const fin = this.splitFechaHora(promocion.fechaFin);
        this.formLimites.setValue({
          fechaInicio: inicio.fecha,
          horaInicio: inicio.hora,
          fechaFin: fin.fecha,
          horaFin: fin.hora,
          usoMaximo: promocion.usoMaximo ?? null,
        });
        this.activo.set(promocion.activo);
        this.seleccion.set({
          sucursales: new Set(promocion.sucursales.map((s) => s.id)),
          bodegas: new Set(promocion.bodegas.map((b) => b.id)),
          categorias: new Set(promocion.categorias.map((c) => c.id)),
          productos: new Set(promocion.productos.map((p) => p.id)),
        });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el cupón/promoción');
      },
    });
  }

  // ---------- Alcance (sucursales/bodegas/categorías/productos) ----------

  protected opcionesDimension(dim: Dimension): Opcion[] {
    switch (dim) {
      case 'sucursales':
        return this.sucursales().map((s) => ({ id: s.id, nombre: s.nombre }));
      case 'bodegas':
        return this.bodegas().map((b) => ({ id: b.id, nombre: b.nombre }));
      case 'categorias':
        return this.categorias().map((c) => ({ id: c.id, nombre: c.nombre }));
      case 'productos':
        return this.productos().map((p) => ({ id: p.id, nombre: p.nombre }));
    }
  }

  protected chipsDe(dim: Dimension): Opcion[] {
    const ids = this.seleccion()[dim];
    return this.opcionesDimension(dim).filter((o) => ids.has(o.id));
  }

  protected abrirAlcance(dim: Dimension): void {
    this.borrador.set(new Set(this.seleccion()[dim]));
    this.alcanceEditando.set(dim);
  }

  protected alternarBorrador(id: string, marcada: boolean): void {
    this.borrador.update((actuales) => {
      const nuevo = new Set(actuales);
      if (marcada) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  }

  protected guardarAlcance(): void {
    const dim = this.alcanceEditando();
    if (!dim) return;
    this.seleccion.update((actual) => ({ ...actual, [dim]: new Set(this.borrador()) }));
    this.alcanceEditando.set(null);
  }

  // ---------- Fecha/hora ----------

  private splitFechaHora(iso?: string): { fecha: string; hora: string } {
    if (!iso) return { fecha: '', hora: '' };
    const fecha = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      fecha: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
      hora: `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`,
    };
  }

  private combinarFechaHora(fecha: string, hora: string): string | undefined {
    if (!fecha) return undefined;
    const [horas, minutos] = (hora || '00:00').split(':').map(Number);
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia, horas, minutos).toISOString();
  }

  protected limitesValidos(): boolean {
    const { fechaInicio, horaInicio, fechaFin, horaFin } = this.formLimites.getRawValue();
    const inicio = this.combinarFechaHora(fechaInicio, horaInicio);
    const fin = this.combinarFechaHora(fechaFin, horaFin);
    if (inicio && fin && new Date(fin) <= new Date(inicio)) return false;
    return true;
  }

  // ---------- Navegación entre pasos ----------

  protected siguiente(): void {
    const actual = this.paso();
    if (!this.puedeAvanzar(actual)) {
      this.marcarPasoInvalido(actual);
      return;
    }
    this.paso.set((actual + 1) as PasoWizard);
  }

  protected anterior(): void {
    const actual = this.paso();
    if (actual > 1) this.paso.set((actual - 1) as PasoWizard);
  }

  private puedeAvanzar(paso: PasoWizard): boolean {
    if (paso === 1) {
      if (this.formPrincipal.invalid) return false;
      if (this.esCupon() && !this.formPrincipal.controls.codigo.value.trim()) return false;
      return true;
    }
    if (paso === 2) return this.formDescuento.valid;
    if (paso === 4) return this.limitesValidos();
    return true;
  }

  private marcarPasoInvalido(paso: PasoWizard): void {
    if (paso === 1) {
      this.formPrincipal.markAllAsTouched();
      if (this.esCupon() && !this.formPrincipal.controls.codigo.value.trim()) {
        this.toast.error('Un cupón necesita un código');
      }
    }
    if (paso === 2) this.formDescuento.markAllAsTouched();
    if (paso === 4) this.toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
  }

  // ---------- Resumen (paso 5) ----------

  protected resumenDescuento(): string {
    const { tipoDescuento, valor } = this.formDescuento.getRawValue();
    return tipoDescuento === 'PORCENTAJE' ? `${valor}% de descuento` : `$${valor} de descuento fijo`;
  }

  protected resumenVigencia(): string {
    const { fechaInicio, fechaFin } = this.formLimites.getRawValue();
    if (!fechaInicio && !fechaFin) return 'Sin límite de tiempo';
    return `${fechaInicio || 'Ahora'} — ${fechaFin || 'Sin fecha de fin'}`;
  }

  protected resumenUso(): string {
    const { usoMaximo } = this.formLimites.getRawValue();
    return usoMaximo ? `Máximo ${usoMaximo} usos` : 'Uso ilimitado';
  }

  // ---------- Guardado ----------

  protected guardar(): void {
    if (this.formPrincipal.invalid || (this.esCupon() && !this.formPrincipal.controls.codigo.value.trim())) {
      this.toast.error('Revisá el paso 1 antes de guardar');
      return;
    }
    if (this.formDescuento.invalid) {
      this.toast.error('Revisá el paso 2 antes de guardar');
      return;
    }
    if (!this.limitesValidos()) {
      this.toast.error('Revisá las fechas del paso 4 antes de guardar');
      return;
    }

    this.guardando.set(true);
    const principal = this.formPrincipal.getRawValue();
    const descuento = this.formDescuento.getRawValue();
    const limites = this.formLimites.getRawValue();
    const seleccion = this.seleccion();

    const payload: PromocionPayload = {
      tipo: principal.tipo,
      nombre: principal.nombre,
      descripcion: principal.descripcion || undefined,
      codigo: principal.tipo === 'CUPON' ? principal.codigo.trim() : undefined,
      tipoDescuento: descuento.tipoDescuento,
      valor: Number(descuento.valor),
      montoMinimoCompra:
        principal.tipo === 'CUPON' && descuento.montoMinimoCompra ? Number(descuento.montoMinimoCompra) : undefined,
      fechaInicio: this.combinarFechaHora(limites.fechaInicio, limites.horaInicio),
      fechaFin: this.combinarFechaHora(limites.fechaFin, limites.horaFin),
      usoMaximo: limites.usoMaximo ? Number(limites.usoMaximo) : undefined,
      activo: this.activo(),
      sucursalIds: Array.from(seleccion.sucursales),
      bodegaIds: Array.from(seleccion.bodegas),
      categoriaIds: Array.from(seleccion.categorias),
      productoIds: Array.from(seleccion.productos),
    };

    const editandoId = this.editandoId();
    const request$ = editandoId ? this.cuponesService.update(editandoId, payload) : this.cuponesService.create(payload);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success(editandoId ? 'Actualizado' : 'Creado');
        this.router.navigate(['/configuracion/cupones']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar');
      },
    });
  }

  protected salir(): void {
    this.router.navigate(['/configuracion/cupones']);
  }
}
