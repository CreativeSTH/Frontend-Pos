import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { AuthService } from '../../../core/services/auth.service';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { CONFIG_GROUPS } from '../../../core/models/configuracion-menu.model';
import { Suscripcion } from '../../../core/models/suscripcion.model';

@Component({
  selector: 'app-configuracion-list',
  standalone: true,
  imports: [Topbar, Icon, RouterLink],
  templateUrl: './configuracion-list.html',
  styleUrl: './configuracion-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionList {
  private readonly auth = inject(AuthService);
  private readonly suscripcionService = inject(SuscripcionService);

  private readonly suscripcion = signal<Suscripcion | null>(null);

  constructor() {
    this.suscripcionService.miEstado().subscribe({
      next: (data) => this.suscripcion.set(data),
      // Si falla la carga, las cards con featureRequerida quedan ocultas por defecto (fail-closed).
      error: () => this.suscripcion.set(null),
    });
  }

  /**
   * Cada grupo se filtra a las cards que el usuario puede VER y, si declaran featureRequerida,
   * a las que además incluye el paquete contratado — mientras la suscripción no cargó, esas
   * cards quedan ocultas para no mostrar un botón que va a fallar al primer click.
   */
  protected readonly grupos = computed(() => {
    const suscripcion = this.suscripcion();
    return CONFIG_GROUPS.map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => {
        if (!this.auth.tienePermiso(item.modulo, item.accion ?? 'VER')) return false;
        if (item.featureRequerida) return suscripcion?.paquete[item.featureRequerida] === true;
        return true;
      }),
    })).filter((grupo) => grupo.items.length > 0);
  });
}
