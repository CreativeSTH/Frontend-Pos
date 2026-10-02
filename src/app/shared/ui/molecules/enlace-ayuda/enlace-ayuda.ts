import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../atoms/icon/icon';

/** Enlace a un artículo del Centro de ayuda desde donde aparece el problema (spec 2026-10-01, sección 5). */
@Component({
  selector: 'ds-enlace-ayuda',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <a
      class="enlace-ayuda"
      [routerLink]="['/ayuda', slug()]"
      [attr.target]="nuevaPestana() ? '_blank' : null"
      [attr.rel]="nuevaPestana() ? 'noopener' : null"
      (click)="$event.stopPropagation(); abierto.emit()"
    >
      <ds-icon name="help-circle" [size]="14" />
      <span><ng-content /></span>
    </a>
  `,
  styles: `
    /* Sin nowrap: en pantallas angostas (o dentro de un modal) un texto largo tiene que poder partirse. */
    .enlace-ayuda {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--space-1);
      max-width: 100%;
      font-size: var(--fs-sm);
      color: var(--accent-primary);
      text-decoration: none;
    }
    .enlace-ayuda ds-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .enlace-ayuda:hover span {
      text-decoration: underline;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnlaceAyuda {
  readonly slug = input.required<string>();
  /** En el POS: abre en otra pestaña para no sacar al cajero de la venta. */
  readonly nuevaPestana = input(false);
  /** El clic no burbujea (para no disparar el clic del contenedor, p. ej. marcar una alerta como leída): avisa por acá. */
  readonly abierto = output<void>();
}
