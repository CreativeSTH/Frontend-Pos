import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { LockScreen } from '../lock-screen/lock-screen';
import { ToastContainer } from '../../shared/ui/organisms/toast-container/toast-container';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { CajaService } from '../../core/services/caja.service';
import { AlertasService } from '../../core/services/alertas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, Sidebar, LockScreen, ToastContainer, Icon],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  // Fuerza la instanciación temprana — cada uno se refresca solo al cambiar de
  // usuario/negocio vía su propio `effect()` (ver CajaService/AlertasService).
  private readonly cajaService = inject(CajaService);
  private readonly alertasService = inject(AlertasService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
    });
  }

  /**
   * FAB "Volver a punto de venta": ayuda al cajero a no perderse fuera del
   * POS mientras tiene un turno abierto — visible en cualquier pantalla
   * salvo en el propio punto de venta.
   */
  protected readonly mostrarVolverPos = computed(
    () =>
      !this.auth.esSistema() &&
      this.cajaService.turnoAbierto() !== null &&
      !this.currentUrl().startsWith('/punto-venta'),
  );
}
