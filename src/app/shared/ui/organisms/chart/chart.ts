import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { Spinner } from '../../atoms/spinner/spinner';
import { EmptyState } from '../../molecules/empty-state/empty-state';
import { registrarTemaPos } from './echarts-theme';

/**
 * Wrapper propio sobre `echarts` (sin `ngx-echarts`) — mismo criterio que
 * `ds-select`: envolver la librería en vez de acoplar la app entera a un
 * binding de terceros. Consume un `EChartsOption` completo (no una forma de
 * datos simplificada) para que el componente sea genérico y sirva tanto al
 * wizard de gráficos como a cualquier otro lugar que necesite graficar.
 */
@Component({
  selector: 'ds-chart',
  standalone: true,
  imports: [Spinner, EmptyState],
  templateUrl: './chart.html',
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chart {
  readonly option = input<EChartsOption | null>(null);
  readonly loading = input(false);
  readonly vacio = input(false);
  readonly mensajeVacio = input('Sin datos para este rango de fechas');
  /** Alto en px, o `'100%'` para que el gráfico llene un contenedor con altura ya definida (ej. un widget de grid). */
  readonly alto = input<number | '100%'>(320);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly destroyRef = inject(DestroyRef);
  private instancia: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      const el = this.host().nativeElement;
      this.instancia = echarts.init(el, registrarTemaPos());
      this.aplicarEstado();

      this.resizeObserver = new ResizeObserver(() => this.instancia?.resize());
      this.resizeObserver.observe(el);

      this.destroyRef.onDestroy(() => {
        this.resizeObserver?.disconnect();
        this.instancia?.dispose();
        this.instancia = null;
      });
    });

    effect(() => {
      this.option();
      this.loading();
      this.aplicarEstado();
    });
  }

  private aplicarEstado(): void {
    if (!this.instancia) return;
    if (this.loading()) {
      this.instancia.showLoading('default', { text: '', maskColor: 'rgba(0, 0, 0, 0)' });
      return;
    }
    this.instancia.hideLoading();
    const opt = this.option();
    if (opt) this.instancia.setOption(opt, true);
  }
}
