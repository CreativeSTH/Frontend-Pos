import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { AuthService } from '../../../core/services/auth.service';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { Button } from '../../../shared/ui/atoms/button/button';

@Component({
  selector: 'app-suscripcion-vencida',
  standalone: true,
  imports: [Button],
  templateUrl: './suscripcion-vencida.html',
  styleUrl: './suscripcion-vencida.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuscripcionVencida {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly pagando = signal(false);

  constructor() {
    this.suscripcionService.miEstado().subscribe((data) => this.suscripcion.set(data));
  }

  /**
   * Cobro simplificado a QR para esta primera versión — el mismo widget de
   * tarjeta que usa el modal de cobro del POS se puede sumar acá después
   * reusando ese componente; QR/Nequi ya cubren el caso más común y no
   * requieren tokenización de tarjeta en el frontend.
   */
  protected reactivarConQr(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.pagando.set(true);
    this.suscripcionService.reactivar({ metodo: 'QR', datosMetodo: {} }).subscribe({
      next: () => {
        this.pagando.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => this.pagando.set(false),
    });
  }

  protected cerrarSesion(): void {
    this.auth.logout();
  }

  /**
   * `precioMensual` llega como string en runtime (columna `numeric` de
   * Postgres) aunque el modelo lo tipe `number` — `Number()` lo normaliza
   * antes de formatear. Sin `CurrencyPipe`/locale es-CO registrado en la
   * app (confirmado: no se usa en ningún otro lugar del código), este
   * Intl.NumberFormat local es la convención ya establecida en el resto
   * de pantallas del proyecto.
   */
  protected formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor));
  }
}
