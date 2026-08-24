import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { Icon } from '../../../atoms/icon/icon';
import { Chart } from '../../chart/chart';

/**
 * Card presentacional montada dentro de un item de `ds-dashboard-grid` — no
 * sabe nada de gridstack, solo recibe los datos ya calculados y expone
 * `quitar` para que el padre remueva el widget del grid.
 */
@Component({
  selector: 'ds-grafico-widget-card',
  standalone: true,
  imports: [Icon, Chart],
  templateUrl: './grafico-widget-card.html',
  styleUrl: './grafico-widget-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoWidgetCard {
  readonly nombre = input.required<string>();
  readonly opcion = input<EChartsOption | null>(null);
  readonly cargando = input(false);
  readonly vacio = input(false);
  readonly editable = input(false);
  readonly quitar = output<void>();
}
