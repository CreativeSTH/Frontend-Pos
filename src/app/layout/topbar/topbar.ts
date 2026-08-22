import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Badge, BadgeTone } from '../../shared/ui/atoms/badge/badge';
import { MobileNavService } from '../../core/services/mobile-nav.service';
import { CajaService } from '../../core/services/caja.service';
import { AlertasService } from '../../core/services/alertas.service';
import { AuthService } from '../../core/services/auth.service';
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
  private readonly cajaService = inject(CajaService);
  protected readonly alertasService = inject(AlertasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Igual que en Sidebar: con turno de caja abierto, el botón hamburguesa se ve en cualquier tamaño de pantalla. */
  protected readonly hamburgerMode = computed(() => this.cajaService.turnoAbierto() !== null);

  /** Un usuario de tier SISTEMA no pertenece a ningún negocio, así que no tiene alertas que ver. */
  protected readonly mostrarCampana = computed(
    () => !this.auth.esSistema() && this.auth.tienePermiso('ALERTAS', 'VER'),
  );

  protected readonly showNotificaciones = signal(false);
  protected readonly cargandoNotificaciones = signal(false);
  protected readonly ultimasAlertas = signal<Alerta[]>([]);

  protected tonoSeveridad(severidad: SeveridadAlerta): BadgeTone {
    return TONOS_SEVERIDAD[severidad];
  }

  protected alternarNotificaciones(): void {
    const abrir = !this.showNotificaciones();
    this.showNotificaciones.set(abrir);
    if (!abrir) return;
    this.cargandoNotificaciones.set(true);
    this.alertasService.findAll().subscribe({
      next: (alertas) => {
        this.ultimasAlertas.set(alertas.slice(0, 5));
        this.cargandoNotificaciones.set(false);
      },
      error: () => this.cargandoNotificaciones.set(false),
    });
  }

  protected irAAlertas(): void {
    this.showNotificaciones.set(false);
    this.router.navigateByUrl('/alertas');
  }
}
