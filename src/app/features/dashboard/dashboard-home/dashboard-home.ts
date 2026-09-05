import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Input } from '../../../shared/ui/atoms/input/input';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Spinner } from '../../../shared/ui/atoms/spinner/spinner';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { DashboardGrid } from '../../../shared/ui/organisms/dashboard-grid/dashboard-grid';
import { ProductosService } from '../../../core/services/productos.service';
import { VentasService } from '../../../core/services/ventas.service';
import { CajaService } from '../../../core/services/caja.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { SucursalContextService } from '../../../core/services/sucursal-context.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { GraficosService } from '../../../core/services/graficos.service';
import { ChecklistOnboarding } from '../checklist-onboarding/checklist-onboarding';
import { ResumenTurno } from '../../../core/models/caja.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { GraficoConfigurado, WidgetLayoutGrafico } from '../../../core/models/grafico.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    Topbar,
    StatCard,
    Badge,
    Button,
    Icon,
    Modal,
    Input,
    FormField,
    Spinner,
    EmptyState,
    DashboardGrid,
    FormsModule,
    DatePipe,
    ChecklistOnboarding,
  ],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHome {
  private readonly productosService = inject(ProductosService);
  private readonly ventasService = inject(VentasService);
  private readonly cajaService = inject(CajaService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly graficosService = inject(GraficosService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly productosCount = signal(0);
  protected readonly ventasHoyCount = signal(0);
  protected readonly ventasHoyTotal = signal(0);
  protected readonly stockBajoCount = signal(0);
  protected readonly turnoAbierto = this.cajaService.turnoAbierto;
  protected readonly sucursales = signal<Sucursal[]>([]);

  protected readonly showAbrirTurno = signal(false);
  protected readonly showConfirmarCerrarTurno = signal(false);
  protected readonly showCerrarTurno = signal(false);
  protected readonly montoInicial = signal<number>(100000);
  /** Monto contado por método de pago (EFECTIVO + cada método digital con movimiento en el turno). */
  protected readonly montosContados = signal<Record<string, number>>({});
  protected readonly procesando = signal(false);
  protected readonly resumenTurno = signal<ResumenTurno | null>(null);
  protected readonly cargandoResumen = signal(false);

  private autoAbrioCierre = false;

  protected readonly cargandoGraficos = signal(true);
  protected readonly graficos = signal<GraficoConfigurado[]>([]);
  protected readonly layoutWidgets = signal<WidgetLayoutGrafico[]>([]);
  /** Se incrementa para forzar destruir/recrear `ds-dashboard-grid` (usado solo al cancelar edición, para descartar cambios sin guardar). */
  protected readonly gridVersion = signal(0);
  protected readonly modoEdicion = signal(false);
  protected readonly guardandoLayout = signal(false);
  protected readonly showAgregarGrafico = signal(false);
  protected readonly graficosParaAgregar = signal<GraficoConfigurado[]>([]);
  protected readonly gridRef = viewChild(DashboardGrid);

  constructor() {
    this.load();
    if (this.auth.tienePermiso('GRAFICOS', 'VER')) {
      this.cargarGraficos();
    } else {
      this.cargandoGraficos.set(false);
    }

    /** Llegar desde el botón flotante "Cerrar caja" del POS (?cerrarTurno=1) abre este modal solo. */
    effect(() => {
      const turno = this.turnoAbierto();
      if (!turno || this.autoAbrioCierre) return;
      if (this.route.snapshot.queryParamMap.get('cerrarTurno') !== '1') return;
      this.autoAbrioCierre = true;
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      this.abrirModalCerrarTurno();
    });
  }

  private load(): void {
    this.loading.set(true);
    // Un usuario de tier SISTEMA (plataforma) no pertenece a ningún negocio —
    // ninguno de estos endpoints le aplica (403 por permiso, o 500 por falta
    // de negocioId en el contexto tenant).
    if (this.auth.esSistema()) {
      this.loading.set(false);
      return;
    }
    forkJoin({
      productos: this.productosService.findAll(),
      ventas: this.ventasService.findAll(),
      sucursales: this.sucursalesService.findAll(),
      stockBajo: this.inventarioService.bajoStock(),
    }).subscribe({
      next: ({ productos, ventas, sucursales, stockBajo }) => {
        this.productosCount.set(productos.length);
        this.sucursales.set(sucursales);
        this.stockBajoCount.set(stockBajo.length);

        const hoy = new Date().toDateString();
        const ventasHoy = ventas.filter((v) => new Date(v.createdAt).toDateString() === hoy);
        this.ventasHoyCount.set(ventasHoy.length);
        this.ventasHoyTotal.set(ventasHoy.reduce((sum, v) => sum + Number(v.total), 0));

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el dashboard');
      },
    });
  }

  protected abrirTurno(): void {
    const sucursalId = this.sucursalContext.sucursalId();
    const sucursal = sucursalId
      ? this.sucursales().find((s) => s.id === sucursalId)
      : this.sucursales()[0];
    if (!sucursal) {
      this.toast.error('Primero crea una sucursal');
      return;
    }
    this.procesando.set(true);
    this.cajaService.abrirTurno(sucursal.id, this.montoInicial()).subscribe({
      next: () => {
        this.procesando.set(false);
        this.showAbrirTurno.set(false);
        this.toast.success('Turno de caja abierto');
        this.router.navigateByUrl('/punto-venta');
      },
      error: (err) => {
        this.procesando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo abrir el turno');
      },
    });
  }

  protected confirmarCerrarTurno(): void {
    this.showConfirmarCerrarTurno.set(false);
    this.abrirModalCerrarTurno();
  }

  protected abrirModalCerrarTurno(): void {
    const turno = this.turnoAbierto();
    if (!turno) return;

    this.showCerrarTurno.set(true);
    this.cargandoResumen.set(true);
    this.resumenTurno.set(null);
    this.cajaService.resumenTurno(turno.id).subscribe({
      next: (resumen) => {
        this.resumenTurno.set(resumen);
        const iniciales: Record<string, number> = {};
        if (resumen.nombreMetodoEfectivo) {
          iniciales[resumen.nombreMetodoEfectivo] = resumen.efectivoEsperado;
        }
        for (const digital of resumen.ventasDigitales) {
          iniciales[digital.metodoPago] = digital.total;
        }
        this.montosContados.set(iniciales);
        this.cargandoResumen.set(false);
      },
      error: () => {
        this.cargandoResumen.set(false);
        this.toast.error('No se pudo cargar el resumen del turno');
      },
    });
  }

  protected actualizarMontoContado(metodoPago: string, monto: number): void {
    this.montosContados.update((actual) => ({ ...actual, [metodoPago]: monto }));
  }

  protected cerrarTurno(): void {
    const turno = this.turnoAbierto();
    if (!turno) return;
    const montosContados = Object.entries(this.montosContados()).map(([metodoPago, monto]) => ({
      metodoPago,
      monto,
    }));
    this.procesando.set(true);
    this.cajaService.cerrarTurno(turno.id, montosContados).subscribe({
      next: () => {
        this.procesando.set(false);
        this.showCerrarTurno.set(false);
        this.toast.success('Turno cerrado correctamente');
      },
      error: (err) => {
        this.procesando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cerrar el turno');
      },
    });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }

  private cargarGraficos(): void {
    this.cargandoGraficos.set(true);
    forkJoin({
      graficos: this.graficosService.findAll(),
      layout: this.graficosService.obtenerLayout('DASHBOARD'),
    }).subscribe({
      next: ({ graficos, layout }) => {
        this.graficos.set(graficos);
        this.layoutWidgets.set(layout.widgets);
        this.cargandoGraficos.set(false);
      },
      error: () => this.cargandoGraficos.set(false),
    });
  }

  protected activarEdicion(): void {
    // `ds-dashboard-grid` reacciona solo (vía `setStatic()` de gridstack) — no hace falta recrearlo.
    this.modoEdicion.set(true);
  }

  protected cancelarEdicion(): void {
    // Acá sí se fuerza recrear el grid — es la única forma de descartar movimientos/tamaños
    // sin guardar y volver a `layoutWidgets()` (el último estado persistido).
    this.modoEdicion.set(false);
    this.gridVersion.update((v) => v + 1);
  }

  protected abrirAgregarGrafico(): void {
    const usados = new Set(this.gridRef()?.obtenerWidgets().map((w) => w.graficoId) ?? []);
    this.graficosParaAgregar.set(this.graficos().filter((g) => !usados.has(g.id)));
    this.showAgregarGrafico.set(true);
  }

  protected elegirGrafico(grafico: GraficoConfigurado): void {
    this.gridRef()?.agregarGrafico(grafico);
    this.showAgregarGrafico.set(false);
  }

  protected guardarDiseno(): void {
    const grid = this.gridRef();
    if (!grid) return;
    const widgets = grid.obtenerWidgets();
    this.guardandoLayout.set(true);
    this.graficosService.guardarLayout('DASHBOARD', widgets).subscribe({
      next: () => {
        this.guardandoLayout.set(false);
        this.layoutWidgets.set(widgets);
        this.modoEdicion.set(false);
        this.toast.success('Diseño guardado');
      },
      error: () => {
        this.guardandoLayout.set(false);
        this.toast.error('No se pudo guardar el diseño');
      },
    });
  }

  protected crearGrafico(): void {
    this.router.navigate(['/graficos/wizard']);
  }
}
