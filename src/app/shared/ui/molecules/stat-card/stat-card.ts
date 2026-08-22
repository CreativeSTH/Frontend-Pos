import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-stat-card',
  standalone: true,
  imports: [Icon],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input<number | undefined>(undefined);
  readonly accent = input<'primary' | 'secondary' | 'cyan' | 'success' | 'warning' | 'danger'>('primary');
}
