import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { PlantillasComprobanteService } from '../../../core/services/plantillas-comprobante.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PlantillaComprobante } from '../../../core/models/plantilla-comprobante.model';

@Component({
  selector: 'app-facturacion-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, Table, EmptyState],
  templateUrl: './facturacion-list.html',
  styleUrl: './facturacion-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionList {
  private readonly plantillasService = inject(PlantillasComprobanteService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly plantillas = signal<PlantillaComprobante[]>([]);

  protected readonly recibos = computed(() => this.plantillas().filter((p) => p.tipo === 'RECIBO'));
  protected readonly facturas = computed(() => this.plantillas().filter((p) => p.tipo === 'FACTURA'));

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.plantillasService.findAll().subscribe({
      next: (data) => {
        this.plantillas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las plantillas');
      },
    });
  }

  protected nueva(): void {
    this.router.navigate(['/configuracion/facturacion/wizard']);
  }

  protected editar(plantilla: PlantillaComprobante): void {
    this.router.navigate(['/configuracion/facturacion/wizard'], { queryParams: { plantillaId: plantilla.id } });
  }

  protected async eliminar(plantilla: PlantillaComprobante): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar la plantilla "${plantilla.nombre}"?`, danger: true })))
      return;
    this.plantillasService.remove(plantilla.id).subscribe({
      next: () => {
        this.toast.success('Plantilla eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar la plantilla'),
    });
  }
}
