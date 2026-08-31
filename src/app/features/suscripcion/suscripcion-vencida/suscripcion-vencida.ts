import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { Button } from '../../../shared/ui/atoms/button/button';

const POLL_MS = 2000;
const POLL_MAX_INTENTOS = 45; // ~90s — mismo presupuesto de espera que un cajero tolera en el POS antes de que el pago se sienta colgado.

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
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly cargandoEstado = signal(true);
  protected readonly errorCargaEstado = signal(false);

  protected readonly pagando = signal(false);
  protected readonly qrImagen = signal<string | null>(null);
  protected readonly esperandoConfirmacion = signal(false);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cargarEstado();
    this.destroyRef.onDestroy(() => this.detenerPolling());
  }

  private cargarEstado(): void {
    this.cargandoEstado.set(true);
    this.errorCargaEstado.set(false);
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        this.cargandoEstado.set(false);
        this.suscripcion.set(data);
      },
      error: () => {
        this.cargandoEstado.set(false);
        this.errorCargaEstado.set(true);
      },
    });
  }

  /**
   * Cobro simplificado a QR para esta primera versión — el mismo widget de
   * tarjeta que usa el modal de cobro del POS se puede sumar acá después
   * reusando ese componente; QR/Nequi ya cubren el caso más común y no
   * requieren tokenización de tarjeta en el frontend.
   *
   * A diferencia de un pago del POS (que confirma por WebSocket en tiempo
   * real, ver punto-venta.ts), acá se resuelve con polling corto de
   * /suscripcion/mi-estado — más simple de razonar para una pantalla de baja
   * frecuencia como esta, y el backend igual emite el evento realtime
   * (`suscripcion:cambio`) para quien más adelante quiera consumirlo.
   */
  protected reactivarConQr(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.pagando.set(true);
    this.qrImagen.set(null);
    this.suscripcionService.reactivar({ metodo: 'QR', datosMetodo: {} }).subscribe({
      next: (resultado) => {
        const qr = resultado.extra?.['qr_image'];
        if (typeof qr === 'string' && qr.length > 0) {
          this.qrImagen.set(qr.startsWith('data:') ? qr : `data:image/svg+xml;base64,${qr}`);
          this.esperarPago();
        } else {
          // Wompi no generó el QR a tiempo (se agotó el polling del backend) — no hay nada que
          // mostrarle al cajero para pagar, así que no tiene sentido seguir esperando.
          this.pagando.set(false);
          this.toast.error('Wompi no generó el código QR — intentá de nuevo en unos segundos');
        }
      },
      error: (err) => {
        this.pagando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo iniciar el pago con Wompi');
      },
    });
  }

  /** Polling corto contra /suscripcion/mi-estado hasta que la suscripción deje de estar VENCIDA o se agote el presupuesto de tiempo. */
  private esperarPago(): void {
    this.esperandoConfirmacion.set(true);
    let intentos = 0;
    this.pollHandle = setInterval(() => {
      intentos++;
      this.suscripcionService.miEstado().subscribe({
        next: (data) => {
          if (data.estado !== 'VENCIDA') {
            this.detenerPolling();
            this.router.navigateByUrl('/dashboard');
            return;
          }
          if (intentos >= POLL_MAX_INTENTOS) {
            this.detenerPolling();
            this.qrImagen.set(null);
            this.toast.error('No confirmamos el pago a tiempo — si ya pagaste, esperá un momento y recargá la página. Si no, generá un código nuevo.');
          }
        },
        // Un error puntual de red durante el polling no debe abortar la espera —
        // se reintenta en la próxima vuelta, salvo que también se agote el presupuesto.
        error: () => {
          if (intentos >= POLL_MAX_INTENTOS) {
            this.detenerPolling();
            this.qrImagen.set(null);
            this.toast.error('No pudimos confirmar el pago — generá un código nuevo para reintentar');
          }
        },
      });
    }, POLL_MS);
  }

  private detenerPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.pagando.set(false);
    this.esperandoConfirmacion.set(false);
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
