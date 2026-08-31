import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-medio-pago',
  standalone: true,
  imports: [Topbar, Button],
  templateUrl: './medio-pago.html',
  styleUrl: './medio-pago.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedioPago {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly loading = signal(true);
  protected readonly activo = signal(false);
  protected readonly ultimosCuatroDigitos = signal<string | null>(null);
  protected readonly quitando = signal(false);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.suscripcionService.medioPago().subscribe({
      next: (data) => {
        this.activo.set(data.activo);
        this.ultimosCuatroDigitos.set(data.ultimosCuatroDigitos);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el medio de pago');
      },
    });
  }

  protected async quitar(): Promise<void> {
    if (!(await this.confirmService.ask({ message: '¿Quitar la tarjeta guardada? Volvés a tener que reactivar manualmente cada mes.', danger: true }))) return;
    this.quitando.set(true);
    this.suscripcionService.quitarMedioPago().subscribe({
      next: () => {
        this.quitando.set(false);
        this.toast.success('Tarjeta quitada');
        this.load();
      },
      error: () => {
        this.quitando.set(false);
        this.toast.error('No se pudo quitar la tarjeta');
      },
    });
  }
}
