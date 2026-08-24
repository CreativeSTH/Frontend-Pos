import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-product-card',
  standalone: true,
  imports: [Icon],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly imageSrc = input<string | null | undefined>(undefined);
  readonly name = input.required<string>();
  readonly priceLabel = input.required<string>();
  /** `undefined`/`null` = sin registro de inventario en la bodega activa (no se muestra badge). */
  readonly stock = input<number | null | undefined>(undefined);
  /** Si viene seteado, hay una promoción vigente: `priceLabel` pasa a ser el precio "ahora" y este el "antes" tachado. */
  readonly originalPriceLabel = input<string | null | undefined>(undefined);
  readonly isPromo = input(false);
}
