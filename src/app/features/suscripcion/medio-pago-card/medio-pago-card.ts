import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MedioPagoEstado } from '../../../core/models/suscripcion.model';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { TarjetaForm } from '../tarjeta-form/tarjeta-form';

const MENSAJE_CORREO = 'Para guardar una tarjeta primero confirma tu correo (usa «Reenviar correo» en el aviso de arriba).';

/** Tarjeta del cobro automático dentro de Mi plan: agregar, reemplazar o quitar sin pagar (spec 2026-10-01, 4.1 b). */
@Component({
  selector: 'app-medio-pago-card',
  standalone: true,
  imports: [Button, Icon, TarjetaForm],
  templateUrl: './medio-pago-card.html',
  styleUrl: './medio-pago-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedioPagoCard {
  private readonly suscripcion = inject(SuscripcionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);

  readonly ciclo = input<'MENSUAL' | 'ANUAL'>('MENSUAL');
  /** Se emite tras guardar o quitar la tarjeta, para que Mi plan actualice "próximo cobro" vs "pago manual". */
  readonly cambio = output<void>();

  protected readonly cargando = signal(true);
  protected readonly estado = signal<MedioPagoEstado | null>(null);
  protected readonly mostrandoForm = signal(false);
  protected readonly guardando = signal(false);
  protected readonly quitando = signal(false);
  /** El backend dijo 403: la sesión puede creer que el correo está confirmado y la DB no. */
  protected readonly errorCorreo = signal(false);
  protected readonly mensajeCorreo = MENSAJE_CORREO;
  protected readonly emailVerificado = computed(() => !!this.auth.usuario()?.emailVerificado && !this.errorCorreo());

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.suscripcion.medioPago().subscribe({
      next: (estado) => {
        this.estado.set(estado);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected guardar(datos: { token: string; ultimosCuatroDigitos: string }): void {
    this.guardando.set(true);
    this.suscripcion.guardarMedioPago(datos.token, datos.ultimosCuatroDigitos).subscribe({
      next: (estado) => {
        this.guardando.set(false);
        this.mostrandoForm.set(false);
        this.estado.set(estado);
        this.toast.success('Tarjeta guardada para el cobro automático');
        this.cambio.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        if (err.status === 403) {
          this.errorCorreo.set(true);
          this.mostrandoForm.set(false);
          return;
        }
        this.toast.error(err.error?.message ?? 'No se pudo guardar la tarjeta');
      },
    });
  }

  protected async quitar(): Promise<void> {
    const ok = await this.confirm.ask({
      message: 'Sin tarjeta, cuando venza tu plan tendrás que pagar a mano con QR o tarjeta. ¿Quitarla?',
      danger: true,
    });
    if (!ok) return;
    this.quitando.set(true);
    this.suscripcion.quitarMedioPago().subscribe({
      next: () => {
        this.quitando.set(false);
        this.estado.set({ activo: false, ultimosCuatroDigitos: null });
        this.toast.success('Tarjeta quitada: el próximo pago será manual');
        this.cambio.emit();
      },
      error: (err) => {
        this.quitando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo quitar la tarjeta');
      },
    });
  }
}
