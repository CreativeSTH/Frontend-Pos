import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuscripcionService } from '../../../../core/services/suscripcion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'app-banner-riesgo-pago',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './banner-riesgo-pago.html',
  styleUrl: './banner-riesgo-pago.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerRiesgoPago {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly auth = inject(AuthService);

  protected readonly enRiesgo = signal(false);
  protected readonly nombrePlan = signal('');

  constructor() {
    // Un usuario de tier SISTEMA no tiene Suscripcion propia — este endpoint le daría 403/500.
    if (this.auth.esSistema()) return;
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        this.enRiesgo.set(data.enRiesgo);
        this.nombrePlan.set(data.paquete.nombre);
      },
      error: () => {}, // silencioso — un banner que no carga no debe ensuciar la consola en cada navegación
    });
  }
}
