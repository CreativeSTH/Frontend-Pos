import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuscripcionService } from '../../../../core/services/suscripcion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Icon } from '../../atoms/icon/icon';

const DIAS_VENTANA = 5;

@Component({
  selector: 'app-banner-dias-restantes-trial',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './banner-dias-restantes-trial.html',
  styleUrl: './banner-dias-restantes-trial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerDiasRestantesTrial {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly auth = inject(AuthService);

  protected readonly visible = signal(false);
  protected readonly diasRestantes = signal(0);

  constructor() {
    // Un usuario de tier SISTEMA no tiene Suscripcion propia — este endpoint le daría 403/500.
    if (this.auth.esSistema()) return;
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        if (data.estado !== 'PRUEBA' || !data.fechaFin) return;
        const fechaFin = new Date(data.fechaFin).getTime();
        const ahora = Date.now();
        if (fechaFin <= ahora) return;
        const dias = Math.ceil((fechaFin - ahora) / (1000 * 60 * 60 * 24));
        if (dias > DIAS_VENTANA) return;
        this.diasRestantes.set(dias);
        this.visible.set(true);
      },
      error: () => {}, // silencioso — un banner que no carga no debe ensuciar la consola en cada navegación
    });
  }
}
