import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ConfiguracionPlantilla, TipoComprobante } from '../../../../core/models/plantilla-comprobante.model';

export interface ItemPreview {
  nombre: string;
  cantidad: number;
  subtotal: number;
}

const ITEMS_MUESTRA: ItemPreview[] = [
  { nombre: 'Producto de ejemplo', cantidad: 2, subtotal: 40000 },
  { nombre: 'Otro producto', cantidad: 1, subtotal: 15000 },
];

/**
 * Vista previa "papel de recibo" — visualmente independiente del design
 * system de la app a propósito (fondo blanco, monospace), igual que
 * `construirHtmlRecibo()` del fallback de navegador: tiene que parecerse a
 * lo que realmente sale impreso, no a la UI oscura de la app. Se usa en el
 * paso 5 del wizard con datos de muestra, y está pensada para reusarse en
 * la Fase D como el renderer real de `GET /ventas/:id/comprobante`.
 */
@Component({
  selector: 'ds-recibo-preview',
  standalone: true,
  templateUrl: './recibo-preview.html',
  styleUrl: './recibo-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReciboPreview {
  readonly tipo = input.required<TipoComprobante>();
  readonly negocioNombre = input<string>('Mi Negocio');
  readonly nit = input<string | undefined>(undefined);
  readonly logoUrl = input<string | null | undefined>(undefined);
  readonly configuracion = input.required<ConfiguracionPlantilla>();
  readonly numero = input<string>('1');

  protected readonly items = ITEMS_MUESTRA;
  protected readonly subtotal = computed(() => this.items.reduce((acc, i) => acc + i.subtotal, 0));
  protected readonly fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date());

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
