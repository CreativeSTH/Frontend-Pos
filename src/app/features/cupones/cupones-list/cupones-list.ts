import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { CuponesService } from '../../../core/services/cupones.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EstadoPromocion, Promocion } from '../../../core/models/promocion.model';

const TONO_ESTADO: Record<EstadoPromocion, BadgeTone> = {
  PROGRAMADA: 'info',
  ACTIVA: 'success',
  EXPIRADA: 'neutral',
  AGOTADA: 'warning',
  INACTIVA: 'danger',
};

const ETIQUETA_ESTADO: Record<EstadoPromocion, string> = {
  PROGRAMADA: 'Programada',
  ACTIVA: 'Activa',
  EXPIRADA: 'Expirada',
  AGOTADA: 'Agotada',
  INACTIVA: 'Inactiva',
};

@Component({
  selector: 'app-cupones-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, Table, EmptyState],
  templateUrl: './cupones-list.html',
  styleUrl: './cupones-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponesList {
  private readonly cuponesService = inject(CuponesService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly promociones = signal<Promocion[]>([]);
  protected readonly tonoEstado = TONO_ESTADO;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  protected readonly promocionesAutomaticas = computed(() => this.promociones().filter((p) => p.tipo === 'PROMOCION'));
  protected readonly cupones = computed(() => this.promociones().filter((p) => p.tipo === 'CUPON'));

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.cuponesService.findAll().subscribe({
      next: (data) => {
        this.promociones.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los cupones y promociones');
      },
    });
  }

  protected nuevo(): void {
    this.router.navigate(['/configuracion/cupones/wizard']);
  }

  protected editar(promocion: Promocion): void {
    this.router.navigate(['/configuracion/cupones/wizard'], { queryParams: { promocionId: promocion.id } });
  }

  protected async eliminar(promocion: Promocion): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${promocion.nombre}"?`, danger: true }))) return;
    this.cuponesService.remove(promocion.id).subscribe({
      next: () => {
        this.toast.success('Eliminado');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  protected vigencia(promocion: Promocion): string {
    if (!promocion.fechaInicio && !promocion.fechaFin) return 'Sin límite de tiempo';
    const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-CO') : '—');
    return `${fmt(promocion.fechaInicio)} — ${fmt(promocion.fechaFin)}`;
  }

  protected usos(promocion: Promocion): string {
    return promocion.usoMaximo != null ? `${promocion.usosActuales}/${promocion.usoMaximo}` : `${promocion.usosActuales}`;
  }
}
