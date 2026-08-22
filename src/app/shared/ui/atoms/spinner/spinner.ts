import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-spinner',
  standalone: true,
  template: `<span class="ds-spinner" [style.width.px]="size()" [style.height.px]="size()"></span>`,
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {
  readonly size = input<number>(24);
}
