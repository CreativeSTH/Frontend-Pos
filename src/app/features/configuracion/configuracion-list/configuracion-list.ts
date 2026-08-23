import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { AuthService } from '../../../core/services/auth.service';
import { CONFIG_GROUPS } from '../../../core/models/configuracion-menu.model';

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

  /** Cada grupo se filtra a las cards que el usuario puede VER; los grupos que quedan vacíos se descartan. */
  protected readonly grupos = computed(() =>
    CONFIG_GROUPS.map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => this.auth.tienePermiso(item.modulo, item.accion ?? 'VER')),
    })).filter((grupo) => grupo.items.length > 0),
  );
}
