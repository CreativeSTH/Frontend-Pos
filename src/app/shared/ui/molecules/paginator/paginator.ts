import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../atoms/icon/icon';
import { Select } from '../../atoms/select/select';

/**
 * Paginador puramente client-side — el consumidor recorta su propio array ya filtrado por
 * `page`/`pageSize` (ver `shared/utils/paginacion.util.ts` para no repetir esa cuenta a mano).
 * `pageSize`/`totalItems` son opcionales: sin ellos se comporta exactamente como antes ("Página X
 * de Y", sin selector de tamaño) — pasarlos suma el selector "Mostrar N" y el rango "X–Y de Z".
 */
@Component({
  selector: 'ds-paginator',
  standalone: true,
  imports: [Icon, Select, FormsModule],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginator {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  readonly pageSize = input<number | undefined>(undefined);
  readonly totalItems = input<number | undefined>(undefined);
  readonly pageSizeOptions = input<number[]>([5, 10, 15, 20, 50, 100, 150]);
  readonly pageSizeChange = output<number>();

  protected readonly puedeAnterior = computed(() => this.page() > 1);
  protected readonly puedeSiguiente = computed(() => this.page() < this.totalPages());
  protected readonly mostrarRango = computed(() => this.pageSize() !== undefined && this.totalItems() !== undefined);
  protected readonly rangoInicio = computed(() => (this.page() - 1) * (this.pageSize() ?? 0) + 1);
  protected readonly rangoFin = computed(() => Math.min(this.page() * (this.pageSize() ?? 0), this.totalItems() ?? 0));

  protected anterior(): void {
    if (this.puedeAnterior()) this.pageChange.emit(this.page() - 1);
  }

  protected siguiente(): void {
    if (this.puedeSiguiente()) this.pageChange.emit(this.page() + 1);
  }

  protected onPageSizeChange(value: string): void {
    this.pageSizeChange.emit(Number(value));
  }
}
