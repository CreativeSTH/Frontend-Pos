import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../../../shared/ui/atoms/icon/icon';
import { Avatar } from '../../../../shared/ui/atoms/avatar/avatar';
import { Button } from '../../../../shared/ui/atoms/button/button';
import { Modal } from '../../../../shared/ui/organisms/modal/modal';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Menú del usuario conectado en el topbar del POS: avatar+nombre que despliega
 * "Pausar caja"/"Cerrar caja" — no necesita nada del padre: pausar solo bloquea la
 * pantalla vía `AuthService` (el turno y el carrito no se tocan) y cerrar solo navega al
 * dashboard con el flag `cerrarTurno` (el cierre en sí pasa ahí, no en el POS).
 */
@Component({
  selector: 'app-turno-caja-pos',
  standalone: true,
  imports: [Icon, Avatar, Button, Modal],
  templateUrl: './turno-caja-pos.html',
  styleUrl: './turno-caja-pos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnoCajaPos {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly showConfirmarCerrarCaja = signal(false);
  protected readonly showConfirmarPausarCaja = signal(false);

  protected confirmarCerrarCaja(): void {
    this.router.navigate(['/dashboard'], { queryParams: { cerrarTurno: '1' } });
  }

  protected confirmarPausarCaja(): void {
    this.showConfirmarPausarCaja.set(false);
    this.auth.pausarCaja();
  }
}
