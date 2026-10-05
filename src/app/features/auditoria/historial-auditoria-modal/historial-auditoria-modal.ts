import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Button } from '../../../shared/ui/atoms/button/button';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PaginaAuditoria } from '../../../core/models/auditoria.model';
import { LineaTiempoAuditoria } from '../linea-tiempo-auditoria/linea-tiempo-auditoria';

/** Historial de un registro puntual (spec auditoría §9). Se abre desde el ícono de reloj de cada listado. */
@Component({
  selector: 'app-historial-auditoria-modal',
  standalone: true,
  imports: [Modal, Icon, Button, EmptyState, Paginator, LineaTiempoAuditoria],
  templateUrl: './historial-auditoria-modal.html',
  styleUrl: './historial-auditoria-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialAuditoriaModal implements OnInit {
  private readonly auditoria = inject(AuditoriaService);

  readonly entidad = input.required<string>();
  readonly entidadId = input.required<string>();
  readonly titulo = input.required<string>();
  readonly close = output<void>();

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly datos = signal<PaginaAuditoria | null>(null);

  ngOnInit(): void {
    this.cargar(1);
  }

  protected cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.auditoria.historial(this.entidad(), this.entidadId(), pagina).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  protected totalPaginas(d: PaginaAuditoria): number {
    return Math.max(1, Math.ceil(d.total / d.porPagina));
  }
}
