import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ds-thumbnail',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="ds-thumbnail" [style.width.px]="size()" [style.height.px]="size()">
      @if (src()) {
        <img [src]="src()" [alt]="alt()" />
      } @else {
        <ds-icon name="box" [size]="size() * 0.42" />
      }
    </div>
  `,
  styleUrl: './thumbnail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Thumbnail {
  readonly src = input<string | null | undefined>(undefined);
  readonly alt = input<string>('');
  readonly size = input<number>(44);
}
