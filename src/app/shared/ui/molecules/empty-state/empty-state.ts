import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-empty-state',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="empty-state">
      <ds-icon [name]="icon()" [size]="32" />
      <p class="empty-state__title">{{ title() }}</p>
      @if (description()) {
        <p class="empty-state__description">{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input<string>('box');
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
}
