import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import type { EChartsOption } from 'echarts';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Chart } from '../../../shared/ui/organisms/chart/chart';
import { construirOpcionEcharts } from '../../../shared/ui/organisms/chart/grafico-echarts.util';
import { ReportesService } from '../../../core/services/reportes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { GraficosService } from '../../../core/services/graficos.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReporteVentas, ReporteMargenes, ReporteCierresCaja } from '../../../core/models/reporte.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { GraficoConfigurado, SerieResultado, WidgetLayoutGrafico } from '../../../core/models/grafico.model';

type Tab = 'ventas' | 'margenes' | 'cierres' | 'graficos';

function isoConOffset(offsetDias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reportes-home',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    StatCard,
    Table,
    FormField,
    Select,
    EmptyState,
    Modal,
    Chart,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './reportes-home.html',
  styleUrl: './reportes-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesHome {
  private readonly reportesService = inject(ReportesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly graficosService = inject(GraficosService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly tab = signal<Tab>('ventas');
  protected readonly sucursales = signal<Sucursal[]>([]);

  protected readonly desde = signal<string>(isoConOffset(-30));
  protected readonly hasta = signal<string>(isoConOffset(0));
  protected readonly sucursalId = signal<string>('');

  protected readonly reporteVentas = signal<ReporteVentas | null>(null);
  protected readonly reporteMargenes = signal<ReporteMargenes | null>(null);
  protected readonly reporteCierres = signal<ReporteCierresCaja | null>(null);

  protected readonly cargandoGraficosTab = signal(true);
  protected readonly graficosDisponibles = signal<GraficoConfigurado[]>([]);
  protected readonly graficosSeleccionados = signal<WidgetLayoutGrafico[]>([]);
  protected readonly datosGraficos = signal<Record<string, SerieResultado[]>>({});
  protected readonly showAgregarGrafico = signal(false);
  protected readonly graficosParaAgregar = computed(() => {
    const usados = new Set(this.graficosSeleccionados().map((w) => w.graficoId));
    return this.graficosDisponibles().filter((g) => !usados.has(g.id));
  });

  constructor() {
    this.sucursalesService.findAll().subscribe({ next: (s) => this.sucursales.set(s) });
    this.load();
    if (this.auth.tienePermiso('GRAFICOS', 'VER')) {
      this.cargarGraficosTab();
    } else {
      this.cargandoGraficosTab.set(false);
    }
  }

  protected cambiarTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected aplicarFiltros(): void {
    this.load();
    this.cargarDatosGraficosSeleccionados();
  }

  private load(): void {
    this.loading.set(true);
    const filtros = {
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
      sucursalId: this.sucursalId() || undefined,
    };
    forkJoin({
      ventas: this.reportesService.ventas(filtros),
      margenes: this.reportesService.margenes(filtros),
      cierres: this.reportesService.cierresCaja(filtros),
    }).subscribe({
      next: ({ ventas, margenes, cierres }) => {
        this.reporteVentas.set(ventas);
        this.reporteMargenes.set(margenes);
        this.reporteCierres.set(cierres);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los reportes');
      },
    });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }

  private cargarGraficosTab(): void {
    this.cargandoGraficosTab.set(true);
    forkJoin({
      graficos: this.graficosService.findAll(),
      layout: this.graficosService.obtenerLayout('REPORTES'),
    }).subscribe({
      next: ({ graficos, layout }) => {
        this.graficosDisponibles.set(graficos);
        this.graficosSeleccionados.set(layout.widgets);
        this.cargandoGraficosTab.set(false);
        this.cargarDatosGraficosSeleccionados();
      },
      error: () => this.cargandoGraficosTab.set(false),
    });
  }

  /** Cada gráfico de esta pestaña se re-consulta contra el filtro de fecha vigente de la página — no contra su rango persistido. */
  private cargarDatosGraficosSeleccionados(): void {
    const seleccionados = this.graficosSeleccionados();
    if (seleccionados.length === 0) return;
    const desde = this.desde() || undefined;
    const hasta = this.hasta() || undefined;
    for (const widget of seleccionados) {
      this.graficosService.datos(widget.graficoId, desde, hasta).subscribe({
        next: (series) => this.datosGraficos.update((actual) => ({ ...actual, [widget.graficoId]: series })),
        error: () => {},
      });
    }
  }

  protected graficoPorId(id: string): GraficoConfigurado | undefined {
    return this.graficosDisponibles().find((g) => g.id === id);
  }

  protected opcionGrafico(graficoId: string): EChartsOption | null {
    const grafico = this.graficoPorId(graficoId);
    const series = this.datosGraficos()[graficoId];
    if (!grafico || !series) return null;
    return construirOpcionEcharts(grafico.tipo, series, grafico.configuracion.opciones);
  }

  protected cargandoGrafico(graficoId: string): boolean {
    return !this.datosGraficos()[graficoId];
  }

  protected graficoVacio(graficoId: string): boolean {
    const series = this.datosGraficos()[graficoId];
    return !!series && series.every((s) => s.datos.length === 0);
  }

  protected agregarGrafico(grafico: GraficoConfigurado): void {
    const nuevo: WidgetLayoutGrafico = { id: crypto.randomUUID(), graficoId: grafico.id, x: 0, y: 0, w: 1, h: 1 };
    this.graficosSeleccionados.update((actual) => [...actual, nuevo]);
    this.showAgregarGrafico.set(false);
    this.guardarSeleccionGraficos();
    this.cargarDatosGraficosSeleccionados();
  }

  protected quitarGrafico(widget: WidgetLayoutGrafico): void {
    this.graficosSeleccionados.update((actual) => actual.filter((w) => w.id !== widget.id));
    this.guardarSeleccionGraficos();
  }

  protected moverGrafico(index: number, direccion: -1 | 1): void {
    const actual = [...this.graficosSeleccionados()];
    const destino = index + direccion;
    if (destino < 0 || destino >= actual.length) return;
    [actual[index], actual[destino]] = [actual[destino], actual[index]];
    this.graficosSeleccionados.set(actual);
    this.guardarSeleccionGraficos();
  }

  private guardarSeleccionGraficos(): void {
    this.graficosService.guardarLayout('REPORTES', this.graficosSeleccionados()).subscribe({
      error: () => this.toast.error('No se pudo guardar la selección de gráficos'),
    });
  }
}
