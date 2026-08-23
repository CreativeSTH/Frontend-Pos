import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { VentasService } from '../../../core/services/ventas.service';
import { PrintAgentService } from '../../../core/services/print-agent.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Venta } from '../../../core/models/venta.model';

// `Partial<Record<...>>` a propósito: `Venta.estado` es `string` (no un union acotado), así que
// un valor que no esté en este mapa es una posibilidad real, no solo una formalidad de tipos —
// el `??` de abajo depende de que el indexado pueda devolver `undefined`.
const ETIQUETAS_ESTADO: Partial<Record<string, string>> = {
  ACTIVA: 'Activa',
  PARCIALMENTE_PAGADA: 'Parcialmente pagada',
  COMPLETADA: 'Completada',
  VENCIDA: 'Vencida',
  EN_MORA: 'En mora',
  CANCELADA: 'Cancelada',
};

const TONOS_ESTADO: Partial<Record<string, BadgeTone>> = {
  ACTIVA: 'info',
  PARCIALMENTE_PAGADA: 'warning',
  COMPLETADA: 'success',
  VENCIDA: 'danger',
  EN_MORA: 'danger',
  CANCELADA: 'neutral',
};

@Component({
  selector: 'app-ventas-list',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    Table,
    Modal,
    FormField,
    Input,
    Select,
    Switch,
    SearchBar,
    EmptyState,
    Paginator,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './ventas-list.html',
  styleUrl: './ventas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasList {
  private readonly ventasService = inject(VentasService);
  protected readonly printAgent = inject(PrintAgentService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly ventas = signal<Venta[]>([]);
  protected readonly search = signal('');
  protected readonly filtroTipo = signal<'' | 'CONTADO' | 'CREDITO'>('');
  protected readonly filtroEstado = signal('');
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO;

  protected readonly showDetalle = signal(false);
  protected readonly ventaDetalle = signal<Venta | null>(null);

  protected readonly showCancelar = signal(false);
  protected readonly ventaCancelar = signal<Venta | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly devolverStock = signal(true);
  protected readonly pinAutorizacion = signal('');
  protected readonly cancelando = signal(false);

  /** Solo quien tiene VENTAS:ELIMINAR cancela directo — cualquier otro rol necesita el PIN de alguien que lo tenga (ver backend). */
  protected readonly requierePin = computed(() => !this.auth.tienePermiso('VENTAS', 'ELIMINAR'));

  protected readonly ventasFiltradas = computed(() => {
    const term = this.search().toLowerCase().trim();
    const tipo = this.filtroTipo();
    const estado = this.filtroEstado();
    return this.ventas()
      .filter((v) => {
        if (tipo && v.tipoVenta !== tipo) return false;
        if (estado && v.estado !== estado) return false;
        if (!term) return true;
        const enProductos = v.items.some((i) => i.nombreProducto.toLowerCase().includes(term));
        return v.nombreCliente.toLowerCase().includes(term) || v.id.toLowerCase().includes(term) || enProductos;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.ventasFiltradas().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly ventasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.ventasFiltradas().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.ventasService.findAll().subscribe({
      next: (data) => {
        this.ventas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las ventas');
      },
    });
  }

  protected tonoEstado(estado: string): BadgeTone {
    return TONOS_ESTADO[estado] ?? 'neutral';
  }

  protected verDetalle(venta: Venta): void {
    this.ventaDetalle.set(venta);
    this.showDetalle.set(true);
  }

  protected abrirCancelar(venta: Venta): void {
    this.ventaCancelar.set(venta);
    this.motivoCancelacion.set('');
    this.devolverStock.set(true);
    this.pinAutorizacion.set('');
    this.showCancelar.set(true);
  }

  protected confirmarCancelar(): void {
    const venta = this.ventaCancelar();
    if (!venta) return;
    if (!this.motivoCancelacion().trim()) {
      this.toast.error('Ingresa el motivo de la cancelación');
      return;
    }
    if (this.requierePin() && !/^\d{4,6}$/.test(this.pinAutorizacion())) {
      this.toast.error('Ingresa el PIN de un administrador (4 a 6 dígitos)');
      return;
    }
    this.cancelando.set(true);
    this.ventasService
      .cancelar(venta.id, this.motivoCancelacion().trim(), this.devolverStock(), this.pinAutorizacion() || undefined)
      .subscribe({
        next: (actualizada) => {
          this.cancelando.set(false);
          this.showCancelar.set(false);
          this.showDetalle.set(false);
          this.toast.success('Venta cancelada');
          this.ventas.update((lista) => lista.map((v) => (v.id === actualizada.id ? actualizada : v)));
        },
        error: (err) => {
          this.cancelando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo cancelar la venta');
        },
      });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
