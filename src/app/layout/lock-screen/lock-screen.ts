import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../shared/ui/atoms/avatar/avatar';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Input } from '../../shared/ui/atoms/input/input';
import { Button } from '../../shared/ui/atoms/button/button';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Overlay de "caja en pausa" — bloquea toda la app (se monta en DashboardLayout,
 * por eso cubre cualquier ruta) sin cerrar el turno ni perder el carrito en
 * curso. Se desbloquea reutilizando `pinSwitch`, igual que el cambio de
 * cajero del sidebar: con el PIN del mismo cajero se reanuda, con el PIN de
 * otro cajero se entrega el turno.
 */
@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [Avatar, Icon, Input, Button, FormsModule],
  templateUrl: './lock-screen.html',
  styleUrl: './lock-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockScreen {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly pin = signal('');
  protected readonly desbloqueando = signal(false);

  protected desbloquear(): void {
    if (!/^\d{4,6}$/.test(this.pin())) {
      this.toast.error('El PIN debe tener entre 4 y 6 dígitos');
      return;
    }
    this.desbloqueando.set(true);
    this.auth.pinSwitch(this.pin()).subscribe({
      next: (respuesta) => {
        this.desbloqueando.set(false);
        this.pin.set('');
        this.toast.success(`Caja reanudada — ${respuesta.usuario.nombre}`);
      },
      error: (err) => {
        this.desbloqueando.set(false);
        this.toast.error(err.error?.message ?? 'PIN inválido');
      },
    });
  }
}
