import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { EChartsOption } from 'echarts';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Stepper, PasoStepper } from '../../../shared/ui/molecules/stepper/stepper';
import { Chart } from '../../../shared/ui/organisms/chart/chart';
import { construirOpcionEcharts } from '../../../shared/ui/organisms/chart/grafico-echarts.util';
import { GraficosService } from '../../../core/services/graficos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ConfiguracionGrafico,
  FuenteDatoCatalogoItem,
  FuenteDatoGrafico,
  SerieResultado,
  TipoGrafico,
} from '../../../core/models/grafico.model';
import { Sucursal } from '../../../core/models/sucursal.model';

type PasoWizard = 1 | 2 | 3 | 4;
type ModoRango = 'FIJO' | 'RELATIVO';
type Agrupacion = 'DIA' | 'SEMANA' | 'MES';
type TipoComparacion = 'PERIODO_ANTERIOR' | 'MISMO_PERIODO_ANIO_ANTERIOR';

const TIPOS_GRAFICO: { valor: TipoGrafico; etiqueta: string; icono: string }[] = [
  { valor: 'LINEA', etiqueta: 'Línea', icono: 'trending-up' },
  { valor: 'AREA', etiqueta: 'Área', icono: 'trending-up' },
  { valor: 'BARRA', etiqueta: 'Barras', icono: 'bar-chart' },
  { valor: 'BARRA_APILADA', etiqueta: 'Barras apiladas', icono: 'bar-chart' },
  { valor: 'PASTEL', etiqueta: 'Circular', icono: 'pie-chart' },
  { valor: 'DONA', etiqueta: 'Dona', icono: 'pie-chart' },
];

/**
 * Crear/editar un gráfico — mismo patrón que `features/asistente`: un solo
 * componente sin subrutas, `paso = signal<N>(1)`, avance explícito con
 * `.set()` en cada handler de "Siguiente". La vista previa (paso 4) llama
 * al mismo endpoint stateless `POST /graficos/preview` que usa el backend
 * para no duplicar la lógica de agregación en el frontend.
 */
@Component({
  selector: 'app-graficos-wizard',
  standalone: true,
  imports: [Topbar, Button, Icon, FormField, Input, Select, Switch, Stepper, Chart, ReactiveFormsModule],
  templateUrl: './graficos-wizard.html',
  styleUrl: './graficos-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficosWizard {
  private readonly graficosService = inject(GraficosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly tiposGrafico = TIPOS_GRAFICO;
  protected readonly pasosStepper: PasoStepper[] = [
    { numero: 1, etiqueta: 'Tipo' },
    { numero: 2, etiqueta: 'Datos' },
    { numero: 3, etiqueta: 'Rango' },
    { numero: 4, etiqueta: 'Vista previa' },
  ];

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly cargandoPreview = signal(false);
  protected readonly paso = signal<PasoWizard>(1);
  protected readonly editandoId = signal<string | null>(null);

  protected readonly fuentes = signal<FuenteDatoCatalogoItem[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly previewSeries = signal<SerieResultado[]>([]);
  protected readonly previewError = signal<string | null>(null);

  protected readonly formPrincipal = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: ['LINEA' as TipoGrafico, Validators.required],
  });

  protected readonly series = this.fb.nonNullable.array([this.nuevaSerie()]);

  protected readonly formRango = this.fb.nonNullable.group({
    modo: ['RELATIVO' as ModoRango, Validators.required],
    diasRelativos: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    desde: [''],
    hasta: [''],
    agrupacion: ['DIA' as Agrupacion, Validators.required],
    compararActivo: [false],
    compararTipo: ['PERIODO_ANTERIOR' as TipoComparacion],
    mostrarLeyenda: [true],
    apilado: [false],
  });

  protected readonly previewVacio = computed(() => this.previewSeries().every((s) => s.datos.length === 0));

  constructor() {
    this.cargar();
  }

  /**
   * Método plano (no computed) a propósito: `formPrincipal.controls.tipo`
   * es un `FormControl`, no un signal — `computed()` nunca detectaría sus
   * cambios. Los eventos de los form directives marcan el componente para
   * re-chequeo igual, así que llamarlo directo desde el template alcanza.
   */
  protected esBarra(): boolean {
    return this.formPrincipal.controls.tipo.value === 'BARRA';
  }

  protected opcionPreview(): EChartsOption | null {
    const datos = this.previewSeries();
    if (datos.length === 0) return null;
    return construirOpcionEcharts(this.formPrincipal.controls.tipo.value, datos, {
      mostrarLeyenda: this.formRango.controls.mostrarLeyenda.value,
      apilado: this.formRango.controls.apilado.value,
    });
  }

  private nuevaSerie() {
    return this.fb.nonNullable.group({
      fuenteDato: ['VENTAS_TOTAL' as FuenteDatoGrafico, Validators.required],
      etiqueta: ['', Validators.required],
      sucursalId: [''],
    });
  }

  private cargar(): void {
    const graficoId = this.route.snapshot.queryParamMap.get('graficoId');
    this.editandoId.set(graficoId);

    forkJoin({
      fuentes: this.graficosService.fuentes(),
      sucursales: this.sucursalesService.findAll(),
    }).subscribe({
      next: ({ fuentes, sucursales }) => {
        this.fuentes.set(fuentes);
        this.sucursales.set(sucursales);
        if (graficoId) {
          this.cargarExistente(graficoId);
        } else {
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la información del asistente');
      },
    });
  }

  private cargarExistente(id: string): void {
    this.graficosService.findOne(id).subscribe({
      next: (grafico) => {
        this.formPrincipal.setValue({ nombre: grafico.nombre, tipo: grafico.tipo });

        this.series.clear();
        for (const serie of grafico.configuracion.series) {
          this.series.push(
            this.fb.nonNullable.group({
              fuenteDato: [serie.fuenteDato, Validators.required],
              etiqueta: [serie.etiqueta, Validators.required],
              sucursalId: [serie.sucursalId ?? ''],
            }),
          );
        }

        const rango = grafico.configuracion.rangoFecha;
        this.formRango.patchValue({
          modo: rango.modo,
          diasRelativos: rango.diasRelativos ?? 30,
          desde: rango.desde ?? '',
          hasta: rango.hasta ?? '',
          agrupacion: grafico.configuracion.agrupacion,
          compararActivo: grafico.configuracion.comparar?.activo ?? false,
          compararTipo: grafico.configuracion.comparar?.tipo ?? 'PERIODO_ANTERIOR',
          mostrarLeyenda: grafico.configuracion.opciones?.mostrarLeyenda ?? true,
          apilado: grafico.configuracion.opciones?.apilado ?? false,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el gráfico');
      },
    });
  }

  protected agregarSerie(): void {
    this.series.push(this.nuevaSerie());
  }

  protected quitarSerie(index: number): void {
    if (this.series.length <= 1) return;
    this.series.removeAt(index);
  }

  protected siguiente(): void {
    const actual = this.paso();
    if (!this.puedeAvanzar(actual)) {
      this.marcarPasoInvalido(actual);
      return;
    }
    const destino = (actual + 1) as PasoWizard;
    this.paso.set(destino);
    if (destino === 4) this.actualizarPreview();
  }

  protected anterior(): void {
    if (this.paso() > 1) this.paso.set((this.paso() - 1) as PasoWizard);
  }

  private puedeAvanzar(paso: PasoWizard): boolean {
    if (paso === 1) return this.formPrincipal.valid;
    if (paso === 2) return this.series.valid && this.series.length > 0;
    if (paso === 3) return this.formRango.valid;
    return true;
  }

  private marcarPasoInvalido(paso: PasoWizard): void {
    if (paso === 1) this.formPrincipal.markAllAsTouched();
    if (paso === 2) this.series.markAllAsTouched();
    if (paso === 3) this.formRango.markAllAsTouched();
  }

  private construirConfiguracion(): ConfiguracionGrafico {
    const rango = this.formRango.getRawValue();
    return {
      series: this.series.getRawValue().map((s) => ({
        fuenteDato: s.fuenteDato,
        etiqueta: s.etiqueta,
        sucursalId: s.sucursalId || undefined,
      })),
      rangoFecha:
        rango.modo === 'RELATIVO'
          ? { modo: 'RELATIVO', diasRelativos: rango.diasRelativos }
          : { modo: 'FIJO', desde: rango.desde || undefined, hasta: rango.hasta || undefined },
      agrupacion: rango.agrupacion,
      comparar: rango.compararActivo ? { activo: true, tipo: rango.compararTipo } : undefined,
      opciones: { mostrarLeyenda: rango.mostrarLeyenda, apilado: rango.apilado },
    };
  }

  protected actualizarPreview(): void {
    this.cargandoPreview.set(true);
    this.previewError.set(null);
    this.graficosService.preview(this.construirConfiguracion()).subscribe({
      next: (series) => {
        this.previewSeries.set(series);
        this.cargandoPreview.set(false);
      },
      error: () => {
        this.cargandoPreview.set(false);
        this.previewError.set('No se pudo calcular la vista previa');
      },
    });
  }

  protected guardar(): void {
    if (this.formPrincipal.invalid || this.series.invalid || this.formRango.invalid) {
      this.toast.error('Revisa los pasos anteriores antes de guardar');
      return;
    }
    this.guardando.set(true);
    const payload = {
      nombre: this.formPrincipal.controls.nombre.value,
      tipo: this.formPrincipal.controls.tipo.value,
      configuracion: this.construirConfiguracion(),
    };
    const editandoId = this.editandoId();
    const request$ = editandoId
      ? this.graficosService.update(editandoId, payload)
      : this.graficosService.create(payload);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success(editandoId ? 'Gráfico actualizado' : 'Gráfico creado');
        this.router.navigate(['/graficos']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el gráfico');
      },
    });
  }

  protected salir(): void {
    this.router.navigate(['/graficos']);
  }
}
