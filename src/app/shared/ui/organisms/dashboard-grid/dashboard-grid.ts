import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  ViewContainerRef,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { GridStack } from 'gridstack';
import type { GridStackWidget } from 'gridstack';
import { GraficosService } from '../../../../core/services/graficos.service';
import { GraficoConfigurado, WidgetLayoutGrafico } from '../../../../core/models/grafico.model';
import { construirOpcionEcharts } from '../chart/grafico-echarts.util';
import { GraficoWidgetCard } from './grafico-widget-card/grafico-widget-card';

/**
 * Wrapper propio sobre `gridstack` (vanilla JS, sin binding de Angular de
 * terceros) — mismo criterio que `ds-chart`/`ds-select`. No sincroniza
 * reactivamente contra `widgetsIniciales()`: se lee una sola vez al montar
 * (gridstack pasa a ser la fuente de verdad de x/y/w/h mientras el
 * componente vive) y el padre lee el estado actual bajo demanda con
 * `obtenerWidgets()` vía `viewChild` — mismo patrón ya usado en
 * `punto-venta.ts`/`asistente.ts` para llamar un método público de un hijo.
 */
@Component({
  selector: 'ds-dashboard-grid',
  standalone: true,
  template: `<div #grid class="ds-dashboard-grid grid-stack"></div>`,
  styleUrl: './dashboard-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGrid {
  readonly widgetsIniciales = input.required<WidgetLayoutGrafico[]>();
  readonly graficos = input.required<GraficoConfigurado[]>();
  readonly editable = input(false);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('grid');
  private readonly vcr = inject(ViewContainerRef);
  private readonly graficosService = inject(GraficosService);
  private readonly destroyRef = inject(DestroyRef);

  private gridInstance: GridStack | null = null;
  private readonly instancias = new Map<string, ComponentRef<GraficoWidgetCard>>();
  private readonly graficoIdPorWidget = new Map<string, string>();

  constructor() {
    afterNextRender(() => {
      this.gridInstance = GridStack.init(
        {
          cellHeight: 90,
          margin: 8,
          column: 12,
          float: true,
          animate: false,
          staticGrid: !this.editable(),
        },
        this.host().nativeElement,
      );

      for (const widget of this.widgetsIniciales()) {
        this.montarWidget(widget);
      }

      this.destroyRef.onDestroy(() => {
        for (const ref of this.instancias.values()) ref.destroy();
        this.gridInstance?.destroy(false);
      });
    });

    // GridStack expone `setStatic()` justo para esto — togglear editabilidad en vivo
    // sin destruir/recrear el grid (que perdería el estado de arrastre en curso).
    effect(() => {
      const editable = this.editable();
      this.gridInstance?.setStatic(!editable);
      for (const ref of this.instancias.values()) ref.setInput('editable', editable);
    });
  }

  private montarWidget(widget: WidgetLayoutGrafico): void {
    const grid = this.gridInstance;
    if (!grid) return;
    const grafico = this.graficos().find((g) => g.id === widget.graficoId);
    if (!grafico) return;

    const item = document.createElement('div');
    item.classList.add('grid-stack-item');
    const content = document.createElement('div');
    content.classList.add('grid-stack-item-content');
    item.appendChild(content);
    grid.el.appendChild(item);

    const componentRef = this.vcr.createComponent(GraficoWidgetCard);
    componentRef.setInput('nombre', grafico.nombre);
    componentRef.setInput('editable', this.editable());
    componentRef.setInput('cargando', true);
    componentRef.instance.quitar.subscribe(() => this.quitarWidget(widget.id));
    content.appendChild(componentRef.location.nativeElement);
    componentRef.changeDetectorRef.detectChanges();

    grid.makeWidget(item, { id: widget.id, x: widget.x, y: widget.y, w: widget.w, h: widget.h });

    this.instancias.set(widget.id, componentRef);
    this.graficoIdPorWidget.set(widget.id, widget.graficoId);

    this.graficosService.datos(widget.graficoId).subscribe({
      next: (series) => {
        componentRef.setInput('cargando', false);
        componentRef.setInput('vacio', series.every((s) => s.datos.length === 0));
        componentRef.setInput('opcion', construirOpcionEcharts(grafico.tipo, series, grafico.configuracion.opciones));
      },
      error: () => {
        componentRef.setInput('cargando', false);
        componentRef.setInput('vacio', true);
      },
    });
  }

  private quitarWidget(id: string): void {
    const ref = this.instancias.get(id);
    if (ref && this.gridInstance) {
      this.gridInstance.removeWidget(ref.location.nativeElement.closest('.grid-stack-item') as HTMLElement);
    }
    ref?.destroy();
    this.instancias.delete(id);
    this.graficoIdPorWidget.delete(id);
  }

  /** Agrega un gráfico nuevo al grid en la primera posición libre — llamado por el padre vía viewChild. */
  agregarGrafico(grafico: GraficoConfigurado): void {
    const id = crypto.randomUUID();
    this.montarWidget({ id, graficoId: grafico.id, x: 0, y: 0, w: 4, h: 3 });
  }

  /** Lee el layout actual desde gridstack (fuente de verdad mientras el componente vive) — llamado al presionar "Guardar diseño". */
  obtenerWidgets(): WidgetLayoutGrafico[] {
    if (!this.gridInstance) return [];
    const nodos = this.gridInstance.save(false) as GridStackWidget[];
    return nodos
      .filter((n) => n.id && this.graficoIdPorWidget.has(String(n.id)))
      .map((n) => ({
        id: String(n.id),
        graficoId: this.graficoIdPorWidget.get(String(n.id))!,
        x: n.x ?? 0,
        y: n.y ?? 0,
        w: n.w ?? 4,
        h: n.h ?? 3,
      }));
  }
}
