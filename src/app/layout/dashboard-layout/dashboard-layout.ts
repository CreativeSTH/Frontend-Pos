import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { LockScreen } from '../lock-screen/lock-screen';
import { ToastContainer } from '../../shared/ui/organisms/toast-container/toast-container';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { CajaService } from '../../core/services/caja.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, LockScreen, ToastContainer, Icon],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  private readonly cajaService = inject(CajaService);
  protected readonly auth = inject(AuthService);

  constructor() {
    // Un usuario de tier SISTEMA (plataforma) no pertenece a ningún negocio —
    // no tiene turno de caja que consultar, y el endpoint le devolvería 403.
    if (!this.auth.esSistema()) {
      this.cajaService.refrescarTurnoAbierto().subscribe();
    }
  }
}
