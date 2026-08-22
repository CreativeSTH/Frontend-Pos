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
}
