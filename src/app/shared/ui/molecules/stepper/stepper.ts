import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

export interface PasoStepper {
  numero: number;
  etiqueta: string;
}

/**
 * Indicador de pasos — extraído de `features/asistente/asistente.scss`
 * (antes hardcodeado ahí). Solo presentacional: no maneja navegación, cada
 * wizard sigue manejando su propio `paso = signal<N>(1)` con `.set()`
 * explícito, mismo criterio que ya usaba el asistente.
 */
@Component({
  selector: 'ds-stepper',
  standalone: true,
  imports: [Icon],
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly pasos = input.required<PasoStepper[]>();
  readonly pasoActual = input.required<number>();
}
