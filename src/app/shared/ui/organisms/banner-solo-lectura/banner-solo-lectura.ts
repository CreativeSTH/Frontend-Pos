import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuscripcionService } from '../../../../core/services/suscripcion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Icon } from '../../atoms/icon/icon';

const DIAS_GRACIA = 3;

@Component({
  selector: 'app-banner-solo-lectura',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './banner-solo-lectura.html',
  styleUrl: './banner-solo-lectura.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerSoloLectura {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly auth = inject(AuthService);

  protected readonly visible = signal(false);
  protected readonly diasRestantes = signal(0);

  constructor() {
    // Un usuario de tier SISTEMA no tiene Suscripcion propia — este endpoint le daría 403/500.
    if (this.auth.esSistema()) return;
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        if (!data.enGracia || !data.fechaFin) return;
        const finGracia = new Date(data.fechaFin).getTime() + DIAS_GRACIA * 24 * 60 * 60 * 1000;
        const dias = Math.ceil((finGracia - Date.now()) / (1000 * 60 * 60 * 24));
        this.diasRestantes.set(Math.max(dias, 0));
        this.visible.set(true);
      },
      error: () => {}, // silencioso — un banner que no carga no debe ensuciar la consola en cada navegación
    });
  }
}
