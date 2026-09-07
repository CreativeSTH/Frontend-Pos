import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { PaquetesService } from '../../../core/services/paquetes.service';
import { ToastService } from '../../../core/services/toast.service';
import { Paquete } from '../../../core/models/paquete.model';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { TarjetaForm } from '../tarjeta-form/tarjeta-form';

const POLL_MS = 2000;
const POLL_MAX_INTENTOS = 45; // ~90s — mismo presupuesto de espera que un cajero tolera en el POS antes de que el pago se sienta colgado.

/**
 * Selector de plan + flujo de pago QR/tarjeta, reusado tanto por el bloqueo forzado de
 * `/suscripcion-vencida` (solo alcanzable con VENCIDA) como por "Mi plan" (voluntario, en
 * cualquier otro momento — pagar antes de que venza, o reactivar tras cancelar).
 */
@Component({
  selector: 'app-selector-plan-pago',
  standalone: true,
  imports: [Button, FormsModule, Switch, TarjetaForm],
  templateUrl: './selector-plan-pago.html',
  styleUrl: './selector-plan-pago.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorPlanPago {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly paquetesService = inject(PaquetesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly suscripcionActual = input.required<Suscripcion>();
  readonly pagado = output<void>();

  protected readonly paquetes = signal<Paquete[]>([]);
  protected readonly paqueteSeleccionadoId = signal<string>('');
  protected readonly paqueteSeleccionado = computed(() =>
    this.paquetes().find((p) => p.id === this.paqueteSeleccionadoId()),
  );

  protected readonly ciclo = signal<'MENSUAL' | 'ANUAL'>('MENSUAL');

  /** Debe coincidir con DESCUENTO_ANUAL_PCT/DIAS_EARLY_BIRD del backend (suscripciones.service.ts) — esto es solo aritmética de exhibición, el backend recalcula y cobra el monto real. */
  private readonly DESCUENTO_ANUAL_PCT = 0.17;
  private readonly DIAS_EARLY_BIRD = 15;

  protected readonly aplicaEarlyBird = computed(() => {
    const s = this.suscripcionActual();
    if (s.estado !== 'PRUEBA') return false;
    const limite = new Date(s.fechaInicio).getTime() + this.DIAS_EARLY_BIRD * 24 * 60 * 60 * 1000;
    return limite > Date.now();
  });

  protected precioMostrado(paquete: Paquete): number {
    const base = this.ciclo() === 'ANUAL' ? Number(paquete.precioMensual) * (1 - this.DESCUENTO_ANUAL_PCT) : Number(paquete.precioMensual);
    return this.aplicaEarlyBird() ? base * 0.75 : base;
  }

  protected precioDeListaTachado(paquete: Paquete): number {
    return this.ciclo() === 'ANUAL' ? Number(paquete.precioMensual) * (1 - this.DESCUENTO_ANUAL_PCT) : Number(paquete.precioMensual);
  }

  protected precioTotalAPagar(paquete: Paquete): number {
    const meses = this.ciclo() === 'ANUAL' ? 12 : 1;
    return this.precioMostrado(paquete) * meses;
  }

  protected elegirCiclo(ciclo: 'MENSUAL' | 'ANUAL'): void {
    this.ciclo.set(ciclo);
  }

  protected readonly pagando = signal(false);
  protected readonly qrImagen = signal<string | null>(null);
  protected readonly esperandoConfirmacion = signal(false);

  protected readonly mostrandoFormTarjeta = signal(false);
  // Opt-in explícito: como esto habilita cobros recurrentes sin más confirmación cada 30 días,
  // arranca destildado — el usuario tiene que activarlo a propósito, no desactivarlo.
  protected readonly guardarTarjeta = signal(false);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.paquetesService
      .disponibles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.paquetes.set(data.filter((p) => !p.esPaqueteFree));
        this.paqueteSeleccionadoId.set(this.suscripcionActual().paqueteId);
      });

    this.destroyRef.onDestroy(() => this.detenerPolling());
  }

  protected elegirPaquete(paqueteId: string): void {
    this.paqueteSeleccionadoId.set(paqueteId);
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
    this.detenerPolling(); // por si quedó un polling anterior corriendo (no debería, el botón queda oculto mientras hay QR, pero blinda contra ese caso)
    this.pagando.set(true);
    this.qrImagen.set(null);
    this.suscripcionService.reactivar({ metodo: 'QR', datosMetodo: {}, paqueteId: this.paqueteSeleccionadoId() || undefined, cicloFacturacion: this.ciclo() }).subscribe({
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

  /**
   * Cobro con tarjeta guardando (opcionalmente) el medio de pago para débito automático.
   *
   * Nota sin confirmar contra el sandbox real de Wompi (ver spec/plan de esta pieza): no está
   * 100% documentado si el cobro vía API directa contra una fuente de pago recién creada dispara
   * un desafío 3DS visible (ej. una URL de redirect) en vez de resolver `APPROVED`/`DECLINED` de
   * una. Por eso, en vez de asumir aprobación inmediata como hace el flujo de QR, acá SIEMPRE se
   * cae al mismo polling de `esperarPago()` — si Wompi aprueba sincrónicamente, el primer poll ya
   * lo va a ver; si hace falta un paso adicional que hoy no sabemos mostrar, al menos no se emite
   * `pagado` con un pago que en realidad sigue pendiente.
   */
  protected pagarConTarjeta(datos: { token: string; ultimosCuatroDigitos: string }): void {
    this.pagando.set(true);
    this.suscripcionService
      .reactivar({
        metodo: 'TARJETA',
        datosMetodo: { token: datos.token, installments: 1 },
        guardarTarjeta: this.guardarTarjeta(),
        ultimosCuatroDigitos: datos.ultimosCuatroDigitos,
        paqueteId: this.paqueteSeleccionadoId() || undefined,
        cicloFacturacion: this.ciclo(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.esperarPago(),
        error: (err) => {
          this.pagando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo procesar el pago con la tarjeta');
        },
      });
  }

  /** Polling corto contra /suscripcion/mi-estado hasta que la suscripción quede ACTIVA o se agote el presupuesto de tiempo. */
  private esperarPago(): void {
    this.esperandoConfirmacion.set(true);
    let intentos = 0;
    this.pollHandle = setInterval(() => {
      intentos++;
      this.suscripcionService
        .miEstado()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            if (data.estado === 'ACTIVA') {
              this.detenerPolling();
              this.pagado.emit();
              return;
            }
            if (intentos >= POLL_MAX_INTENTOS) this.agotarEsperaDePago();
          },
          // Un error puntual de red durante el polling no debe abortar la espera —
          // se reintenta en la próxima vuelta, salvo que también se agote el presupuesto.
          error: () => {
            if (intentos >= POLL_MAX_INTENTOS) this.agotarEsperaDePago();
          },
        });
    }, POLL_MS);
  }

  /**
   * Al agotar el presupuesto de polling del frontend (90s) NO se borra el QR ni se invita a
   * generar uno nuevo — `SuscripcionesService.iniciarReactivacion` en el backend tiene su propia
   * ventana de idempotencia de 10 minutos (evita cobros duplicados) y rechazaría exactamente ese
   * intento con un mensaje contradictorio. El QR sigue siendo válido y pagable más allá de los
   * 90s (un QR de Bancolombia vive bastante más que eso); esto solo detiene el polling activo del
   * frontend, no invalida el pago.
   */
  private agotarEsperaDePago(): void {
    this.detenerPolling();
    this.toast.error('Seguimos sin confirmar el pago. Si ya pagaste, esperá unos segundos y recargá la página.');
  }

  private detenerPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.pagando.set(false);
    this.esperandoConfirmacion.set(false);
  }

  /**
   * `precioMensual` llega como string en runtime (columna `numeric` de
   * Postgres) aunque el modelo lo tipe `number` — `Number()` lo normaliza
   * antes de formatear.
   */
  protected formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor));
  }
}
