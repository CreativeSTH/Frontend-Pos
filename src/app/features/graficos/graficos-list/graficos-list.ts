import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { GraficosService } from '../../../core/services/graficos.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { GraficoConfigurado, TipoGrafico } from '../../../core/models/grafico.model';

const ICONO_TIPO: Record<TipoGrafico, string> = {
  LINEA: 'trending-up',
  AREA: 'trending-up',
  BARRA: 'bar-chart',
  BARRA_APILADA: 'bar-chart',
  PASTEL: 'pie-chart',
  DONA: 'pie-chart',
};

const ETIQUETA_TIPO: Record<TipoGrafico, string> = {
  LINEA: 'Línea',
  AREA: 'Área',
  BARRA: 'Barras',
  BARRA_APILADA: 'Barras apiladas',
  PASTEL: 'Circular',
  DONA: 'Dona',
};

@Component({
  selector: 'app-graficos-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, EmptyState, Paginator],
  templateUrl: './graficos-list.html',
  styleUrl: './graficos-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficosList {
  private readonly graficosService = inject(GraficosService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly graficos = signal<GraficoConfigurado[]>([]);

  protected readonly pag = usePaginacion(this.graficos);
  protected readonly graficosPaginados = this.pag.itemsPaginados;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.graficosService.findAll().subscribe({
      next: (data) => {
        this.graficos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los gráficos');
      },
    });
  }

  protected icono(tipo: TipoGrafico): string {
    return ICONO_TIPO[tipo];
  }

  protected etiquetaTipo(tipo: TipoGrafico): string {
    return ETIQUETA_TIPO[tipo];
  }

  protected cantidadSeries(grafico: GraficoConfigurado): number {
    return grafico.configuracion.series.length;
  }

  protected nuevo(): void {
    this.router.navigate(['/graficos/wizard']);
  }

  protected editar(grafico: GraficoConfigurado): void {
    this.router.navigate(['/graficos/wizard'], { queryParams: { graficoId: grafico.id } });
  }

  protected async eliminar(grafico: GraficoConfigurado): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar el gráfico "${grafico.nombre}"?`, danger: true }))) return;
    this.graficosService.remove(grafico.id).subscribe({
      next: () => {
        this.toast.success('Gráfico eliminado');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar el gráfico'),
    });
  }
}
