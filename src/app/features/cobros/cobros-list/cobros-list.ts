import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { CobrosService } from '../../../core/services/cobros.service';
import { VentasService } from '../../../core/services/ventas.service';
import { MetodosPagoService } from '../../../core/services/metodos-pago.service';
import { ToastService } from '../../../core/services/toast.service';
import { CobroItem, CobrosTotales } from '../../../core/models/cobro.model';
import { MetodoPago } from '../../../core/models/metodo-pago.model';

type Filtro = 'pendientes' | 'vencidos' | 'proxima-quincena';

@Component({
  selector: 'app-cobros-list',
  standalone: true,
  imports: [Topbar, Button, Badge, Icon, StatCard, Table, Modal, FormField, Input, Select, EmptyState, Paginator, FormsModule, DatePipe],
  templateUrl: './cobros-list.html',
  styleUrl: './cobros-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobrosList {
  private readonly cobrosService = inject(CobrosService);
  private readonly ventasService = inject(VentasService);
  private readonly metodosPagoService = inject(MetodosPagoService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly totales = signal<CobrosTotales | null>(null);
  protected readonly items = signal<CobroItem[]>([]);
  protected readonly filtro = signal<Filtro>('pendientes');

  protected readonly showAbono = signal(false);
  protected readonly cobroSeleccionado = signal<CobroItem | null>(null);
  protected readonly montoAbono = signal<number>(0);
  protected readonly metodoPago = signal<string>('');
  protected readonly guardando = signal(false);
  protected readonly metodosPago = signal<MetodoPago[]>([]);

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.items().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly itemsPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.items().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
    this.metodosPagoService.findAll().subscribe((metodos) => this.metodosPago.set(metodos));
  }

  protected cambiarFiltro(filtro: Filtro): void {
    this.filtro.set(filtro);
    this.pagina.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const items$ =
      this.filtro() === 'pendientes'
        ? this.cobrosService.pendientes()
        : this.filtro() === 'vencidos'
          ? this.cobrosService.vencidos()
          : this.cobrosService.proximaQuincena();

    forkJoin({ items: items$, totales: this.cobrosService.totales() }).subscribe({
      next: ({ items, totales }) => {
        this.items.set(items);
        this.totales.set(totales);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los cobros');
      },
    });
  }

  protected abrirAbono(item: CobroItem): void {
    this.cobroSeleccionado.set(item);
    this.montoAbono.set(item.cuota.montoTotalConMora);
    this.metodoPago.set(this.metodosPago()[0]?.nombre ?? '');
    this.showAbono.set(true);
  }

  protected confirmarAbono(): void {
    const item = this.cobroSeleccionado();
    if (!item || this.montoAbono() <= 0) {
      this.toast.error('Ingresa un monto válido');
      return;
    }
    this.guardando.set(true);
    this.ventasService
      .abonarCuota(item.ventaId, {
        numeroCuota: item.cuota.numero,
        montoAbono: this.montoAbono(),
        metodoPago: this.metodoPago(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.showAbono.set(false);
          this.toast.success('Abono registrado');
          this.load();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo registrar el abono');
        },
      });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
