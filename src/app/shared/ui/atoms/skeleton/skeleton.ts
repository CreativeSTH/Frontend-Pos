import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloque de carga genérico (pulso, sin datos reales todavía) — se compone para armar la forma de cualquier contenido real, ej. una tarjeta de producto. */
@Component({
  selector: 'ds-skeleton',
  standalone: true,
  template: `<span class="ds-skeleton" [style.width]="width()" [style.height]="height()" [style.border-radius]="radius()"></span>`,
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly width = input<string>('100%');
  readonly height = input<string>('1em');
  readonly radius = input<string>('var(--radius-sm)');
}
