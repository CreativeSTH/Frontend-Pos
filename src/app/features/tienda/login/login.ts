import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClienteAuthService } from '../../../core/services/cliente-auth.service';

@Component({
  selector: 'app-tienda-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaLogin {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clienteAuthService = inject(ClienteAuthService);

  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  protected readonly telefono = signal('');
  protected readonly password = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.clienteAuthService
      .login(this.negocioId, { telefono: this.telefono(), password: this.password() })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.router.navigate(['/tienda', this.negocioId, 'cuenta']);
        },
        error: (err) => {
          this.enviando.set(false);
          this.error.set(err.error?.message ?? 'No se pudo iniciar sesión');
        },
      });
  }
}
