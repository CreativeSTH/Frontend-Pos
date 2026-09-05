import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Icon } from '../../atoms/icon/icon';
import { Button } from '../../atoms/button/button';

const DESCARTADO_KEY = 'pos_banner_email_descartado';

@Component({
  selector: 'app-banner-verificar-email',
  standalone: true,
  imports: [Icon, Button],
  templateUrl: './banner-verificar-email.html',
  styleUrl: './banner-verificar-email.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerVerificarEmail {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly descartado = signal(sessionStorage.getItem(DESCARTADO_KEY) === '1');
  protected readonly reenviando = signal(false);

  protected visible(): boolean {
    const usuario = this.auth.usuario();
    return !!usuario && !usuario.emailVerificado && !this.descartado();
  }

  protected descartar(): void {
    sessionStorage.setItem(DESCARTADO_KEY, '1');
    this.descartado.set(true);
  }

  protected reenviar(): void {
    const email = this.auth.usuario()?.email;
    if (!email) return;
    this.reenviando.set(true);
    this.auth.reenviarVerificacion(email).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.toast.success('Te reenviamos el correo de verificación');
      },
      error: () => {
        this.reenviando.set(false);
        this.toast.error('No se pudo reenviar el correo');
      },
    });
  }
}
