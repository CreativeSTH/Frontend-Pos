import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'ds-badge',
  standalone: true,
  template: `
    <span class="ds-badge" [class]="'ds-badge--' + tone()">
      <span class="ds-badge__dot"></span>
      <ng-content />
    </span>
  `,
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
}
