import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { ToastService } from '../../../core/services/toast.service';
import { Suscripcion } from '../../../core/models/suscripcion.model';
import { SelectorPlanPago } from '../selector-plan-pago/selector-plan-pago';

const MOTIVOS = ['Muy caro', 'Me faltó una función', 'Cambio de proveedor', 'Otro'];

@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [Topbar, Button, Select, Modal, RouterLink, DatePipe, FormsModule, SelectorPlanPago],
  templateUrl: './mi-plan.html',
  styleUrl: './mi-plan.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPlan {
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly toast = inject(ToastService);

  protected readonly motivos = MOTIVOS;
  protected readonly suscripcion = signal<Suscripcion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly showCancelar = signal(false);
  protected readonly motivoSeleccionado = signal('');
  protected readonly procesando = signal(false);
  protected readonly mostrandoPago = signal(false);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.suscripcionService.miEstado().subscribe({
      next: (data) => {
        this.suscripcion.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
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
        this.toast.success(
          eraPrueba
            ? 'Suscripción cancelada — seguís con tu prueba gratis hasta que termine'
            : 'Suscripción cancelada — seguís con acceso hasta que termine el período pagado',
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

  protected onPagado(): void {
    this.mostrandoPago.set(false);
    this.cargar();
  }
}
