import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

/** Paginador puramente client-side — el consumidor recorta su propio array ya filtrado por `page`/`pageSize`. */
@Component({
  selector: 'ds-paginator',
  standalone: true,
  imports: [Icon],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginator {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly puedeAnterior = computed(() => this.page() > 1);
  protected readonly puedeSiguiente = computed(() => this.page() < this.totalPages());

  protected anterior(): void {
    if (this.puedeAnterior()) this.pageChange.emit(this.page() - 1);
  }

  protected siguiente(): void {
    if (this.puedeSiguiente()) this.pageChange.emit(this.page() + 1);
  }
}
