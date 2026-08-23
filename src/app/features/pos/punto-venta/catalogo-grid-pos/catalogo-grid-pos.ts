import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProductCard } from '../../../../shared/ui/molecules/product-card/product-card';
import { EmptyState } from '../../../../shared/ui/molecules/empty-state/empty-state';
import { Producto } from '../../../../core/models/producto.model';
import { formatMoney, imageUrl } from '../pos-shared.util';

/** Grilla de productos del catálogo — puramente presentacional, ya recibe la lista filtrada. */
@Component({
  selector: 'app-catalogo-grid-pos',
  standalone: true,
  imports: [ProductCard, EmptyState],
  templateUrl: './catalogo-grid-pos.html',
  styleUrl: './catalogo-grid-pos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoGridPos {
  readonly productos = input.required<Producto[]>();
  readonly stockPorProducto = input.required<Map<string, number>>();

  readonly seleccionar = output<Producto>();

  protected readonly imageUrl = imageUrl;
  protected readonly formatMoney = formatMoney;

  protected stockDe(productoId: string): number | null {
    return this.stockPorProducto().get(productoId) ?? null;
  }
}
