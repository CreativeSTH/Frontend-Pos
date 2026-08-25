import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Badge, BadgeTone } from '../../shared/ui/atoms/badge/badge';
import { MobileNavService } from '../../core/services/mobile-nav.service';
import { AlertasService } from '../../core/services/alertas.service';
import { ListaPedidosService } from '../../core/services/lista-pedidos.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Alerta, SeveridadAlerta } from '../../core/models/alerta.model';
import { DatePipe } from '@angular/common';

const TONOS_SEVERIDAD: Record<SeveridadAlerta, BadgeTone> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  CRITICA: 'danger',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [Icon, Badge, DatePipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  readonly title = input<string>('');
  readonly subtitle = input<string | undefined>(undefined);

  protected readonly mobileNav = inject(MobileNavService);
  protected readonly alertasService = inject(AlertasService);
  private readonly listaPedidosService = inject(ListaPedidosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Un usuario de tier SISTEMA no pertenece a ningún negocio, así que no tiene alertas que ver. */
  protected readonly mostrarCampana = computed(
    () => !this.auth.esSistema() && this.auth.tienePermiso('ALERTAS', 'VER'),
  );

  /** `ultimasAlertas` vive en el servicio (se refresca solo cada 30s) — el panel solo la muestra. */
  protected readonly showNotificaciones = signal(false);

  protected tonoSeveridad(severidad: SeveridadAlerta): BadgeTone {
    return TONOS_SEVERIDAD[severidad];
  }

  protected esAlertaDeStock(alerta: Alerta): boolean {
    return (alerta.tipo === 'STOCK_BAJO' || alerta.tipo === 'PRODUCTO_AGOTADO') && !!alerta.productoId;
  }

  protected alternarNotificaciones(): void {
    const abrir = !this.showNotificaciones();
    this.showNotificaciones.set(abrir);
    if (abrir) {
      this.alertasService.refrescarConteo().subscribe();
    }
  }

  /** Al tocar una notificación del panel se marca como leída — el contador de la campana se recalcula solo. */
  protected marcarLeidaNotif(alerta: Alerta): void {
    if (alerta.leida) return;
    this.alertasService.marcarLeida(alerta.id).subscribe({
      next: () => this.alertasService.refrescarConteo().subscribe(),
      error: () => this.toast.error('No se pudo marcar como leída'),
    });
  }

  protected agregarAListaPedidos(alerta: Alerta): void {
    if (!alerta.productoId) return;
    this.listaPedidosService.agregar(alerta.productoId).subscribe({
      next: () => this.toast.success('Agregado a la lista de pedidos'),
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo agregar a la lista de pedidos'),
    });
  }

  protected irAAlertas(): void {
    this.showNotificaciones.set(false);
    this.router.navigateByUrl('/alertas');
  }
}
