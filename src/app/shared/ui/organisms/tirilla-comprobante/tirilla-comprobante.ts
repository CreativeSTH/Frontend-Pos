import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReciboContenido } from '../../../../core/models/recibo-contenido.model';
import { environment } from '../../../../../environments/environment';

/**
 * Vista en pantalla de lo que sale impreso (mismo `ReciboContenido` que usan pos-agent y el respaldo
 * de navegador). Fondo blanco y monospace a propósito: tiene que parecerse al papel, no a la app.
 */
@Component({
  selector: 'ds-tirilla-comprobante',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './tirilla-comprobante.html',
  styleUrl: './tirilla-comprobante.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TirillaComprobante {
  readonly contenido = input.required<ReciboContenido>();
  /** El backend guarda rutas relativas (`/uploads/...`). */
  protected readonly assetsUrl = environment.assetsUrl;
  protected readonly e = computed(() =>
    this.contenido().tipo === 'FACTURA_ELECTRONICA' ? this.contenido().electronica : undefined,
  );

  protected money(valor: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
  }
}
