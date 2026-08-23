import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/ui/atoms/button/button';
import { EmptyState } from '../../../../shared/ui/molecules/empty-state/empty-state';
import { FormField } from '../../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../../shared/ui/atoms/input/input';
import { Modal } from '../../../../shared/ui/organisms/modal/modal';
import {
  LineaCarritoSuspendida,
  VentaSuspendida,
  VentasSuspendidasService,
} from '../../../../core/services/ventas-suspendidas.service';
import { ToastService } from '../../../../core/services/toast.service';
import { calcularImpuesto, calcularSubtotal, formatMoney } from '../pos-shared.util';

/**
 * Dueño de "Ventas suspendidas": botón + contador en el topbar y los 3 modales (suspender,
 * listar, confirmar retomar). El botón "Suspender venta" del carrito vive en `PuntoVenta` (es
 * parte del flujo del carrito, no de este feature) y llama a `abrirSuspenderVenta()` vía
 * `viewChild` — mismo patrón que ya usa `PuntoVenta` para reenfocar el buscador.
 */
@Component({
  selector: 'app-ventas-suspendidas-pos',
  standalone: true,
  imports: [Button, EmptyState, FormField, Input, Modal, FormsModule],
  templateUrl: './ventas-suspendidas-pos.html',
  styleUrl: './ventas-suspendidas-pos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasSuspendidasPos {
  private readonly ventasSuspendidasService = inject(VentasSuspendidasService);
  private readonly toast = inject(ToastService);

  readonly carrito = input.required<LineaCarritoSuspendida[]>();
  readonly descuentoVenta = input.required<number>();

  /** Se suspendió el carrito actual — el padre debe vaciar el suyo. */
  readonly suspendida = output<void>();
  /** Se retomó una venta suspendida — el padre debe reemplazar su carrito con este. */
  readonly retomada = output<{ carrito: LineaCarritoSuspendida[]; descuentoVenta: number }>();

  protected readonly ventasSuspendidas = this.ventasSuspendidasService.ventas;
  protected readonly showSuspenderVenta = signal(false);
  protected readonly notaSuspension = signal('');
  protected readonly showVentasSuspendidas = signal(false);
  protected readonly ventaSuspendidaARetomar = signal<VentaSuspendida | null>(null);
  protected readonly showConfirmarRetomar = signal(false);
  protected readonly formatMoney = formatMoney;

  /** Llamado desde `PuntoVenta` vía `viewChild` cuando el cajero aprieta "Suspender venta" en el carrito. */
  abrirSuspenderVenta(): void {
    if (this.carrito().length === 0) return;
    this.notaSuspension.set('');
    this.showSuspenderVenta.set(true);
  }

  protected confirmarSuspenderVenta(): void {
    this.ventasSuspendidasService.suspender(this.carrito(), this.descuentoVenta(), this.notaSuspension());
    this.showSuspenderVenta.set(false);
    this.toast.success('Venta suspendida');
    this.suspendida.emit();
  }

  protected retomarVentaSuspendida(venta: VentaSuspendida): void {
    this.showVentasSuspendidas.set(false);
    if (this.carrito().length > 0) {
      this.ventaSuspendidaARetomar.set(venta);
      this.showConfirmarRetomar.set(true);
      return;
    }
    this.aplicarVentaSuspendida(venta);
  }

  protected confirmarRetomarVenta(): void {
    const venta = this.ventaSuspendidaARetomar();
    if (!venta) return;
    this.aplicarVentaSuspendida(venta);
    this.showConfirmarRetomar.set(false);
    this.ventaSuspendidaARetomar.set(null);
  }

  private aplicarVentaSuspendida(venta: VentaSuspendida): void {
    this.ventasSuspendidasService.retomar(venta.id);
    this.retomada.emit({ carrito: venta.carrito, descuentoVenta: venta.descuentoVenta });
    this.toast.success('Venta retomada');
  }

  protected eliminarVentaSuspendida(venta: VentaSuspendida): void {
    this.ventasSuspendidasService.eliminar(venta.id);
    this.toast.success('Venta suspendida eliminada');
  }

  protected totalVentaSuspendida(venta: VentaSuspendida): number {
    const subtotal = calcularSubtotal(venta.carrito);
    const impuesto = calcularImpuesto(venta.carrito);
    return Math.max(0, subtotal + impuesto - venta.descuentoVenta);
  }
}
