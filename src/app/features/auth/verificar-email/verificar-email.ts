import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Spinner } from '../../../shared/ui/atoms/spinner/spinner';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [Button, Icon, Spinner],
  templateUrl: './verificar-email.html',
  styleUrl: './verificar-email.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarEmail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly estado = signal<'verificando' | 'error' | 'reenviado'>('verificando');
  protected readonly reenviando = signal(false);
  private email = '';

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('error');
      return;
    }
    this.auth.confirmarEmail(token).subscribe({
      next: () => this.router.navigateByUrl('/asistente'),
      error: () => this.estado.set('error'),
    });
  }

  protected reenviar(): void {
    if (!this.email) return;
    this.reenviando.set(true);
    this.auth.reenviarVerificacion(this.email).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.estado.set('reenviado');
      },
      error: () => {
        this.reenviando.set(false);
      },
    });
  }

  protected setEmail(value: string): void {
    this.email = value;
  }
}
