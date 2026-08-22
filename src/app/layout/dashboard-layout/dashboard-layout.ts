import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { LockScreen } from '../lock-screen/lock-screen';
import { ToastContainer } from '../../shared/ui/organisms/toast-container/toast-container';
import { CajaService } from '../../core/services/caja.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, LockScreen, ToastContainer],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  private readonly cajaService = inject(CajaService);
  protected readonly auth = inject(AuthService);

  constructor() {
    this.cajaService.refrescarTurnoAbierto().subscribe();
  }
}
