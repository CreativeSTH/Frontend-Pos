import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { ReportesService } from '../../../core/services/reportes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReporteVentas, ReporteMargenes, ReporteCierresCaja } from '../../../core/models/reporte.model';
import { Sucursal } from '../../../core/models/sucursal.model';

type Tab = 'ventas' | 'margenes' | 'cierres';

const ETIQUETAS_METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  OTRO: 'Otro',
};

function isoConOffset(offsetDias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reportes-home',
  standalone: true,
  imports: [Topbar, Button, Badge, Icon, StatCard, Table, FormField, Select, EmptyState, FormsModule, DatePipe],
  templateUrl: './reportes-home.html',
  styleUrl: './reportes-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesHome {
  private readonly reportesService = inject(ReportesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly tab = signal<Tab>('ventas');
  protected readonly sucursales = signal<Sucursal[]>([]);

  protected readonly desde = signal<string>(isoConOffset(-30));
  protected readonly hasta = signal<string>(isoConOffset(0));
  protected readonly sucursalId = signal<string>('');

  protected readonly reporteVentas = signal<ReporteVentas | null>(null);
  protected readonly reporteMargenes = signal<ReporteMargenes | null>(null);
  protected readonly reporteCierres = signal<ReporteCierresCaja | null>(null);

  constructor() {
    this.sucursalesService.findAll().subscribe({ next: (s) => this.sucursales.set(s) });
    this.load();
  }

  protected cambiarTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected aplicarFiltros(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const filtros = {
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
      sucursalId: this.sucursalId() || undefined,
    };
    forkJoin({
      ventas: this.reportesService.ventas(filtros),
      margenes: this.reportesService.margenes(filtros),
      cierres: this.reportesService.cierresCaja(filtros),
    }).subscribe({
      next: ({ ventas, margenes, cierres }) => {
        this.reporteVentas.set(ventas);
        this.reporteMargenes.set(margenes);
        this.reporteCierres.set(cierres);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los reportes');
      },
    });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }

  protected etiquetaMetodoPago(metodo: string): string {
    return ETIQUETAS_METODO_PAGO[metodo] ?? metodo;
  }
}
