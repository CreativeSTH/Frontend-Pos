import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { AuthService } from '../../../core/services/auth.service';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { Button } from '../../../shared/ui/atoms/button/button';
import { SelectorPlanPago } from '../selector-plan-pago/selector-plan-pago';

@Component({
  selector: 'app-suscripcion-vencida',
  standalone: true,
  imports: [Button, SelectorPlanPago],
  templateUrl: './suscripcion-vencida.html',
  styleUrl: './suscripcion-vencida.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuscripcionVencida {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly cargandoEstado = signal(true);
  protected readonly errorCargaEstado = signal(false);

  constructor() {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargandoEstado.set(true);
    this.errorCargaEstado.set(false);
    this.suscripcionService
      .miEstado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          // Si ya no está VENCIDA (se activó por otra vía — el webhook llegó tarde, se pagó desde
          // otra pestaña, un admin la reactivó a mano), esta pantalla no aplica. Sin esto, recargar
          // la página estando ya ACTIVA muestra de nuevo "tu suscripción venció" con un botón que,
          // dentro de la ventana de idempotencia del backend, respondería con un error contradictorio.
          if (data.estado !== 'VENCIDA') {
            this.router.navigateByUrl('/dashboard');
            return;
          }
          this.cargandoEstado.set(false);
          this.suscripcion.set(data);
        },
        error: () => {
          this.cargandoEstado.set(false);
          this.errorCargaEstado.set(true);
        },
      });
  }

  protected onPagado(): void {
    this.router.navigateByUrl('/dashboard');
  }

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
