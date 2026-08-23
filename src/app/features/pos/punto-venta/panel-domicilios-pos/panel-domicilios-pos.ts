import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../../shared/ui/atoms/badge/badge';
import { Button } from '../../../../shared/ui/atoms/button/button';
import { AuthService } from '../../../../core/services/auth.service';
import { DomiciliosService } from '../../../../core/services/domicilios.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Domicilio } from '../../../../core/models/domicilio.model';

/**
 * Panel rápido de domicilios en el POS — para que el cajero avance estados sin salir de la
 * pantalla. Prácticamente autónomo: todo lo que necesita ya es un servicio `providedIn: 'root'`,
 * no depende de estado del padre (`PuntoVenta`).
 */
@Component({
  selector: 'app-panel-domicilios-pos',
  standalone: true,
  imports: [Icon, Badge, Button, RouterLink],
  templateUrl: './panel-domicilios-pos.html',
  styleUrl: './panel-domicilios-pos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDomiciliosPos {
  protected readonly auth = inject(AuthService);
  protected readonly domiciliosService = inject(DomiciliosService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly showPanelDomicilios = signal(false);
  protected readonly guardandoDomicilioPanel = signal<string | null>(null);

  protected alternarPanelDomicilios(): void {
    this.showPanelDomicilios.update((v) => !v);
  }

  /** Sin pedir quién lo lleva — es la vía rápida; ese detalle se completa desde "Ver más" si hace falta. */
  protected marcarEnCaminoDesdePos(domicilio: Domicilio): void {
    this.guardandoDomicilioPanel.set(domicilio.id);
    this.domiciliosService.marcarEnCamino(domicilio.id).subscribe({
      next: () => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.success('Domicilio en camino');
      },
      error: (err) => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.error(err.error?.message ?? 'No se pudo actualizar el domicilio');
      },
    });
  }

  protected async marcarEntregadoDesdePos(domicilio: Domicilio): Promise<void> {
    if (!(await this.confirmService.ask(`¿Confirmar la entrega a "${domicilio.nombreCliente}"?`))) return;
    this.guardandoDomicilioPanel.set(domicilio.id);
    this.domiciliosService.marcarEntregado(domicilio.id).subscribe({
      next: () => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.success('Domicilio entregado');
      },
      error: (err) => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.error(err.error?.message ?? 'No se pudo actualizar el domicilio');
      },
    });
  }

  protected async cancelarDesdePos(domicilio: Domicilio): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Cancelar el domicilio de "${domicilio.nombreCliente}"?`, danger: true })))
      return;
    this.guardandoDomicilioPanel.set(domicilio.id);
    this.domiciliosService.cancelar(domicilio.id).subscribe({
      next: () => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.success('Domicilio cancelado');
      },
      error: (err) => {
        this.guardandoDomicilioPanel.set(null);
        this.toast.error(err.error?.message ?? 'No se pudo cancelar el domicilio');
      },
    });
  }
}
