import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { AsistenciaService } from '../../../core/services/asistencia.service';
import { ConexionService, esErrorDeConexion } from '../../../core/services/conexion.service';
import { ResultadoMarca } from '../../../core/models/empleado.model';
import { duracionLegible, horaColombia } from '../../../shared/utils/fecha-colombia.util';

type Estado = 'esperando' | 'marcando' | 'resultado' | 'error';

const CIERRE_AUTOMATICO_MS = 4000;

/**
 * Teclado de PIN para marcar entrada o salida (spec 2026-10-04 turnos §4). AURA decide si es entrada o
 * salida; la hora es la del servidor. `enModal = false` lo dibuja sin `ds-modal` (pantalla de bloqueo,
 * que ya es un overlay por encima de los modales).
 */
@Component({
  selector: 'app-marcar-asistencia',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, Button, Icon, Input, Modal, EnlaceAyuda],
  templateUrl: './marcar-asistencia.html',
  styleUrl: './marcar-asistencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcarAsistencia {
  private readonly asistencia = inject(AsistenciaService);
  private readonly conexion = inject(ConexionService);

  readonly sucursalId = input<string | null | undefined>(null);
  readonly enModal = input(true);
  readonly cerrar = output<void>();

  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly pin = signal('');
  protected readonly estado = signal<Estado>('esperando');
  protected readonly resultado = signal<ResultadoMarca | null>(null);
  protected readonly error = signal('');
  protected readonly enLinea = this.conexion.enLinea;
  protected readonly puedeMarcar = computed(
    () => this.enLinea() && !!this.sucursalId() && /^\d{4,6}$/.test(this.pin()) && this.estado() !== 'marcando',
  );
  protected readonly duracion = duracionLegible;
  protected readonly hora = horaColombia;

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiarTemporizador());
  }

  protected tecla(d: string): void {
    if (this.estado() === 'resultado') this.reiniciar();
    if (this.pin().length < 6) this.pin.update((p) => p + d);
    if (this.estado() === 'error') this.estado.set('esperando');
  }

  protected borrar(): void {
    this.pin.update((p) => p.slice(0, -1));
  }

  protected escribir(valor: string): void {
    this.pin.set((valor ?? '').replace(/\D/g, '').slice(0, 6));
    if (this.estado() === 'error') this.estado.set('esperando');
  }

  protected marcar(): void {
    const sucursalId = this.sucursalId();
    if (!this.puedeMarcar() || !sucursalId) return;
    this.estado.set('marcando');
    this.asistencia.marcar(this.pin(), sucursalId).subscribe({
      next: (r) => {
        this.pin.set('');
        this.resultado.set(r);
        this.estado.set('resultado');
        this.limpiarTemporizador();
        this.temporizador = setTimeout(() => this.cerrar.emit(), CIERRE_AUTOMATICO_MS);
      },
      error: (err) => {
        this.pin.set('');
        this.error.set(
          esErrorDeConexion(err)
            ? 'Marcar asistencia necesita internet. Hazlo cuando vuelva la conexión.'
            : (err.error?.message ?? 'No se pudo marcar'),
        );
        this.estado.set('error');
      },
    });
  }

  private reiniciar(): void {
    this.limpiarTemporizador();
    this.resultado.set(null);
    this.estado.set('esperando');
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }
}
