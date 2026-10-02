import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { ToastService } from '../../../core/services/toast.service';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { SelectorPlanPago } from '../selector-plan-pago/selector-plan-pago';
import { MedioPagoCard } from '../medio-pago-card/medio-pago-card';
import { HistorialPagos } from '../historial-pagos/historial-pagos';

const MOTIVOS = ['Muy caro', 'Me faltó una función', 'Cambio de proveedor', 'Otro'];
// Intl y no DatePipe: la app no tiene locale `es` registrado para Angular.
const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const ETIQUETAS_ESTADO: Record<string, { texto: string; tono: BadgeTone }> = {
  PRUEBA: { texto: 'En prueba', tono: 'info' },
  ACTIVA: { texto: 'Activa', tono: 'success' },
  CANCELADA: { texto: 'Cancelada', tono: 'warning' },
  VENCIDA: { texto: 'Vencida', tono: 'danger' },
};

/**
 * Mi plan (spec 2026-10-01 mi-plan-completo): tu plan + cambiar de plan o pagar (PRUEBA, ACTIVA),
 * tarjeta del cobro automático e historial de pagos. Reemplaza a la vieja página de Medio de pago.
 */
@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [Topbar, Button, Badge, Select, Modal, FormsModule, SelectorPlanPago, MedioPagoCard, HistorialPagos],
  templateUrl: './mi-plan.html',
  styleUrl: './mi-plan.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPlan {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly historial = viewChild(HistorialPagos);

  protected readonly motivos = MOTIVOS;
  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly showCancelar = signal(false);
  protected readonly motivoSeleccionado = signal('');
  protected readonly procesando = signal(false);
  protected readonly mostrandoPago = signal(false);
  /** Con tarjeta guardada la fecha es un cobro automático; sin ella, un vencimiento con pago manual. */
  protected readonly tieneTarjeta = signal(false);
  protected readonly etiquetaEstado = computed(() => ETIQUETAS_ESTADO[this.suscripcion()?.estado ?? ''] ?? null);

  constructor() {
    this.cargar();
    // Link directo desde el banner de días restantes del trial — abre el pago sin un click extra.
    if (this.route.snapshot.queryParamMap.get('pagar') === '1') {
      this.mostrandoPago.set(true);
    }
  }

  protected cargar(): void {
    this.cargando.set(this.suscripcion() === null);
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        this.suscripcion.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.suscripcionService.medioPago().subscribe({
      next: (estado) => this.tieneTarjeta.set(estado.activo),
      error: () => this.tieneTarjeta.set(false),
    });
  }

  protected fecha(iso: string | null): string {
    return iso ? fechaLarga.format(new Date(iso)) : '';
  }

  protected abrirCancelar(): void {
    this.motivoSeleccionado.set('');
    this.showCancelar.set(true);
  }

  protected confirmarCancelacion(): void {
    const eraPrueba = this.suscripcion()?.estado === 'PRUEBA';
    this.procesando.set(true);
    this.suscripcionService.cancelar(this.motivoSeleccionado() || undefined).subscribe({
      next: () => {
        this.procesando.set(false);
        this.showCancelar.set(false);
        this.mostrandoPago.set(false);
        this.toast.success(
          eraPrueba
            ? 'Suscripción cancelada: sigues con tu prueba gratis hasta que termine'
            : 'Suscripción cancelada: sigues con acceso hasta que termine el período pagado',
        );
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cancelar');
      },
    });
  }

  protected revertir(): void {
    this.procesando.set(true);
    this.suscripcionService.revertirCancelacion().subscribe({
      next: (data) => {
        this.procesando.set(false);
        this.toast.success(data.estado === 'PRUEBA' ? 'Tu prueba gratis sigue activa' : 'Tu plan sigue activo');
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo reactivar');
      },
    });
  }

  protected onPagado(actualizada: Suscripcion): void {
    // El selector entrega la suscripción ya pagada antes de cerrar su diálogo: se aplica de una vez.
    this.suscripcion.set(actualizada);
    this.mostrandoPago.set(false);
    this.toast.success('Pago confirmado: tu plan quedó actualizado');
    this.cargar();
    this.historial()?.recargar(1);
  }
}
