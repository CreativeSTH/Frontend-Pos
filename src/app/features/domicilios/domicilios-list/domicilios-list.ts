import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { DomiciliosService } from '../../../core/services/domicilios.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Domicilio, EstadoDomicilio } from '../../../core/models/domicilio.model';

type Tab = 'NUEVO' | 'EN_CAMINO' | 'HISTORIAL';

const TONOS_ESTADO: Record<EstadoDomicilio, BadgeTone> = {
  NUEVO: 'info',
  EN_CAMINO: 'warning',
  ENTREGADO: 'success',
  CANCELADO: 'danger',
};

const ETIQUETAS_ESTADO: Record<EstadoDomicilio, string> = {
  NUEVO: 'Nuevo',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-domicilios-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, Table, Modal, FormField, Input, EmptyState, FormsModule, RouterLink, DatePipe],
  templateUrl: './domicilios-list.html',
  styleUrl: './domicilios-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomiciliosList {
  private readonly domiciliosService = inject(DomiciliosService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly etiquetasEstado = ETIQUETAS_ESTADO;

  protected readonly loading = signal(true);
  protected readonly items = signal<Domicilio[]>([]);
  protected readonly tabActual = signal<Tab>('NUEVO');

  protected readonly itemsFiltrados = computed(() => {
    const tab = this.tabActual();
    return this.items().filter((d) =>
      tab === 'HISTORIAL' ? d.estado === 'ENTREGADO' || d.estado === 'CANCELADO' : d.estado === tab,
    );
  });

  // --- Marcar en camino ---
  protected readonly showEnCaminoModal = signal(false);
  protected readonly domicilioEnCamino = signal<Domicilio | null>(null);
  protected readonly domiciliarioNombre = signal('');
  protected readonly guardandoEnCamino = signal(false);

  // --- Cancelar ---
  protected readonly showCancelarModal = signal(false);
  protected readonly domicilioACancelar = signal<Domicilio | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly cancelando = signal(false);

  constructor() {
    this.load();
    this.realtime.on<Domicilio>('domicilios:cambio', () => this.load(true));
  }

  private load(silencioso = false): void {
    if (!silencioso) this.loading.set(true);
    this.domiciliosService.findAll().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (!silencioso) this.toast.error('No se pudieron cargar los domicilios');
      },
    });
  }

  private reemplazar(actualizado: Domicilio): void {
    this.items.update((lista) => lista.map((d) => (d.id === actualizado.id ? actualizado : d)));
  }

  protected tonoEstado(estado: EstadoDomicilio): BadgeTone {
    return TONOS_ESTADO[estado];
  }

  protected abrirEnCamino(domicilio: Domicilio): void {
    this.domicilioEnCamino.set(domicilio);
    this.domiciliarioNombre.set('');
    this.showEnCaminoModal.set(true);
  }

  protected confirmarEnCamino(): void {
    const domicilio = this.domicilioEnCamino();
    if (!domicilio) return;
    this.guardandoEnCamino.set(true);
    this.domiciliosService.marcarEnCamino(domicilio.id, this.domiciliarioNombre().trim() || undefined).subscribe({
      next: (actualizado) => {
        this.guardandoEnCamino.set(false);
        this.showEnCaminoModal.set(false);
        this.reemplazar(actualizado);
        this.toast.success('Domicilio en camino');
      },
      error: (err) => {
        this.guardandoEnCamino.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo actualizar el domicilio');
      },
    });
  }

  protected async marcarEntregado(domicilio: Domicilio): Promise<void> {
    if (!(await this.confirmService.ask(`¿Confirmar la entrega a "${domicilio.nombreCliente}"?`))) return;
    this.domiciliosService.marcarEntregado(domicilio.id).subscribe({
      next: (actualizado) => {
        this.reemplazar(actualizado);
        this.toast.success('Domicilio entregado');
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo actualizar el domicilio'),
    });
  }

  protected abrirCancelar(domicilio: Domicilio): void {
    this.domicilioACancelar.set(domicilio);
    this.motivoCancelacion.set('');
    this.showCancelarModal.set(true);
  }

  protected confirmarCancelar(): void {
    const domicilio = this.domicilioACancelar();
    if (!domicilio) return;
    this.cancelando.set(true);
    this.domiciliosService.cancelar(domicilio.id, this.motivoCancelacion().trim() || undefined).subscribe({
      next: (actualizado) => {
        this.cancelando.set(false);
        this.showCancelarModal.set(false);
        this.reemplazar(actualizado);
        this.toast.success('Domicilio cancelado');
      },
      error: (err) => {
        this.cancelando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cancelar el domicilio');
      },
    });
  }
}
