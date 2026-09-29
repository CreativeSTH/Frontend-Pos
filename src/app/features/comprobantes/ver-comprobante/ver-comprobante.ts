import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Spinner } from '../../../shared/ui/atoms/spinner/spinner';
import { TirillaComprobante } from '../../../shared/ui/organisms/tirilla-comprobante/tirilla-comprobante';
import { FacturaDetalle } from '../../facturas-electronicas/factura-detalle/factura-detalle';
import { AuthService } from '../../../core/services/auth.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImpresionComprobanteService } from '../../../core/services/impresion-comprobante.service';
import { ReciboContenido } from '../../../core/models/recibo-contenido.model';

/**
 * Único "Ver comprobante" de una venta (Caja, Ventas y, en la fase 5, Facturación): con factura
 * electrónica y permiso para verlas abre el detalle completo (PDF, XML, reintento); en cualquier
 * otro caso muestra la tirilla tal como se imprime.
 */
@Component({
  selector: 'app-ver-comprobante',
  standalone: true,
  imports: [Modal, Button, Badge, Spinner, TirillaComprobante, FacturaDetalle],
  templateUrl: './ver-comprobante.html',
  styleUrl: './ver-comprobante.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerComprobante {
  private readonly auth = inject(AuthService);
  private readonly ventasService = inject(VentasService);
  private readonly toast = inject(ToastService);
  private readonly impresion = inject(ImpresionComprobanteService);

  readonly ventaId = input.required<string>();
  readonly documentoElectronicoId = input<string | null>(null);
  readonly close = output<void>();

  protected readonly usarDetalleFactura = computed(
    () => !!this.documentoElectronicoId() && this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'VER'),
  );
  protected readonly contenido = signal<ReciboContenido | null>(null);
  protected readonly imprimiendo = signal(false);

  constructor() {
    effect(() => {
      if (this.usarDetalleFactura()) return;
      this.ventasService.obtenerComprobante(this.ventaId()).subscribe({
        next: (contenido) => this.contenido.set(contenido),
        error: () => {
          this.toast.error('No se pudo cargar el comprobante');
          this.close.emit();
        },
      });
    });
  }

  protected imprimir(): void {
    this.imprimiendo.set(true);
    this.impresion.imprimir(this.ventaId()).subscribe(() => this.imprimiendo.set(false));
  }
}
