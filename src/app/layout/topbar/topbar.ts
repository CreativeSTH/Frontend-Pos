import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { MobileNavService } from '../../core/services/mobile-nav.service';
import { CajaService } from '../../core/services/caja.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [Icon],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  readonly title = input<string>('');
  readonly subtitle = input<string | undefined>(undefined);

  protected readonly mobileNav = inject(MobileNavService);
  private readonly cajaService = inject(CajaService);

  /** Igual que en Sidebar: con turno de caja abierto, el botón hamburguesa se ve en cualquier tamaño de pantalla. */
  protected readonly hamburgerMode = computed(() => this.cajaService.turnoAbierto() !== null);
}
