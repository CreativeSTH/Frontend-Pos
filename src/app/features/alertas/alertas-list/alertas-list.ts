import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Select } from '../../../shared/ui/atoms/select/select';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { AlertasService } from '../../../core/services/alertas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Alerta, ResumenAlertas, SeveridadAlerta, TipoAlerta } from '../../../core/models/alerta.model';

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  STOCK_BAJO: 'Stock bajo',
  CUOTA_POR_VENCER: 'Cuota por vencer',
  CUOTA_VENCIDA: 'Cuota vencida',
  CLIENTE_LIMITE_CREDITO: 'Límite de crédito',
  VENTA_EN_MORA: 'Venta en mora',
};

const TONOS_SEVERIDAD: Record<SeveridadAlerta, BadgeTone> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  CRITICA: 'danger',
};

@Component({
  selector: 'app-alertas-list',
  standalone: true,
  imports: [Topbar, Button, Badge, Icon, Table, Select, StatCard, EmptyState, FormsModule, DatePipe],
  templateUrl: './alertas-list.html',
  styleUrl: './alertas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasList {
  private readonly alertasService = inject(AlertasService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly alertas = signal<Alerta[]>([]);
  protected readonly resumen = signal<ResumenAlertas | null>(null);
  protected readonly generando = signal(false);

  protected readonly filtroTipo = signal<TipoAlerta | ''>('');
  protected readonly filtroSeveridad = signal<SeveridadAlerta | ''>('');
  protected readonly filtroResuelta = signal<'' | 'true' | 'false'>('false');

  protected readonly etiquetasTipo = ETIQUETAS_TIPO;
  protected readonly tiposAlerta = Object.keys(ETIQUETAS_TIPO) as TipoAlerta[];

  protected readonly alertasFiltradas = computed(() => {
    const tipo = this.filtroTipo();
    const severidad = this.filtroSeveridad();
    const resuelta = this.filtroResuelta();
    return this.alertas().filter((a) => {
      if (tipo && a.tipo !== tipo) return false;
      if (severidad && a.severidad !== severidad) return false;
      if (resuelta && a.resuelta !== (resuelta === 'true')) return false;
      return true;
    });
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.alertasService.findAll().subscribe({
      next: (alertas) => {
        this.alertas.set(alertas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las alertas');
      },
    });
    this.recargarResumen();
  }

  private recargarResumen(): void {
    this.alertasService.resumen().subscribe((resumen) => this.resumen.set(resumen));
  }

  protected tonoSeveridad(severidad: SeveridadAlerta): BadgeTone {
    return TONOS_SEVERIDAD[severidad];
  }

  protected generar(): void {
    this.generando.set(true);
    this.alertasService.generar().subscribe({
      next: () => {
        this.generando.set(false);
        this.toast.success('Alertas actualizadas');
        this.load();
        this.alertasService.refrescarConteo().subscribe();
      },
      error: () => {
        this.generando.set(false);
        this.toast.error('No se pudieron actualizar las alertas');
      },
    });
  }

  protected marcarLeida(alerta: Alerta): void {
    this.alertasService.marcarLeida(alerta.id).subscribe({
      next: (actualizada) => {
        this.alertas.update((lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a)));
        this.recargarResumen();
        this.alertasService.refrescarConteo().subscribe();
      },
      error: () => this.toast.error('No se pudo marcar como leída'),
    });
  }

  protected resolver(alerta: Alerta): void {
    this.alertasService.resolver(alerta.id).subscribe({
      next: (actualizada) => {
        this.alertas.update((lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a)));
        this.toast.success('Alerta resuelta');
        this.recargarResumen();
        this.alertasService.refrescarConteo().subscribe();
      },
      error: () => this.toast.error('No se pudo resolver la alerta'),
    });
  }
}
