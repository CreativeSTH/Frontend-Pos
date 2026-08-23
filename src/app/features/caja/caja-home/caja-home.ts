import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { CajaService } from '../../../core/services/caja.service';
import { VentasService } from '../../../core/services/ventas.service';
import { PrintAgentService } from '../../../core/services/print-agent.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurnoCaja } from '../../../core/models/caja.model';
import { MovimientoCaja, TipoMovimientoCaja } from '../../../core/models/movimiento-caja.model';
import { Venta } from '../../../core/models/venta.model';

const ETIQUETAS_TIPO: Record<string, string> = {
  VENTA: 'Venta',
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  RETIRO: 'Retiro',
};

interface FilaCaja {
  id: string;
  createdAt: string;
  tipo: TipoMovimientoCaja;
  ventaId?: string;
  concepto?: string;
  metodos: { metodoPago?: string; monto: number }[];
  montoTotal: number;
}

@Component({
  selector: 'app-caja-home',
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
    EmptyState,
    SearchBar,
    Paginator,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './caja-home.html',
  styleUrl: './caja-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaHome {
  private readonly cajaService = inject(CajaService);
  private readonly ventasService = inject(VentasService);
  protected readonly printAgent = inject(PrintAgentService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly turnos = signal<TurnoCaja[]>([]);
  protected readonly movimientos = signal<MovimientoCaja[]>([]);
  protected readonly ventasPorId = signal<Map<string, Venta>>(new Map());
  protected readonly search = signal('');
  protected readonly showMovimiento = signal(false);
  protected readonly tipoMovimiento = signal<TipoMovimientoCaja>('INGRESO');
  protected readonly montoMovimiento = signal<number>(0);
  protected readonly conceptoMovimiento = signal('');
  protected readonly guardando = signal(false);
  protected readonly etiquetasTipo = ETIQUETAS_TIPO;

  protected readonly showFactura = signal(false);
  protected readonly ventaFactura = signal<Venta | null>(null);

  protected readonly showDetalleTurno = signal(false);
  protected readonly turnoDetalle = signal<TurnoCaja | null>(null);
  protected readonly ventasDetalleTurno = signal<Venta[]>([]);
  protected readonly cargandoDetalleTurno = signal(false);

  protected readonly showPagarDescuadre = signal(false);
  protected readonly turnoPagarDescuadre = signal<TurnoCaja | null>(null);
  protected readonly montoPagarDescuadre = signal<number>(0);
  protected readonly pagandoDescuadre = signal(false);

  protected readonly showCancelarVenta = signal(false);
  protected readonly filaCancelar = signal<FilaCaja | null>(null);
  protected readonly motivoCancelarVenta = signal('');
  protected readonly devolverStockCancelar = signal(true);
  protected readonly pinCancelarVenta = signal('');
  protected readonly cancelandoVenta = signal(false);

  /** Solo quien tiene VENTAS:ELIMINAR cancela directo — cualquier otro rol necesita el PIN de alguien que lo tenga (ver backend). */
  protected readonly requierePin = computed(() => !this.auth.tienePermiso('VENTAS', 'ELIMINAR'));

  protected readonly turnoAbierto = computed(() => this.turnos().find((t) => t.estado === 'ABIERTO') ?? null);
  protected readonly historial = computed(() => this.turnos().filter((t) => t.estado === 'CERRADO'));

  protected readonly filtroDesde = signal('');
  protected readonly filtroHasta = signal('');
  protected readonly filtroUsuarioId = signal('');

  /** Usuarios (apertura o cierre) que aparecen en el historial — para poblar el filtro sin pegarle a `/usuarios`. */
  protected readonly usuariosHistorial = computed(() => {
    const mapa = new Map<string, string>();
    for (const turno of this.historial()) {
      if (turno.usuarioApertura) mapa.set(turno.usuarioApertura.id, turno.usuarioApertura.nombre);
      if (turno.usuarioCierre) mapa.set(turno.usuarioCierre.id, turno.usuarioCierre.nombre);
    }
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly historialFiltrado = computed(() => {
    const desde = this.filtroDesde();
    const hasta = this.filtroHasta();
    const usuarioId = this.filtroUsuarioId();
    return this.historial().filter((turno) => {
      if (desde && turno.fechaApertura.slice(0, 10) < desde) return false;
      if (hasta && turno.fechaApertura.slice(0, 10) > hasta) return false;
      if (usuarioId && turno.usuarioAperturaId !== usuarioId && turno.usuarioCierreId !== usuarioId) return false;
      return true;
    });
  });

  protected readonly movimientosFiltrados = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.movimientos();
    const ventas = this.ventasPorId();
    return this.movimientos().filter((mov) => {
      const cliente = mov.ventaId ? ventas.get(mov.ventaId)?.nombreCliente ?? '' : '';
      return (
        cliente.toLowerCase().includes(term) ||
        (mov.concepto ?? '').toLowerCase().includes(term) ||
        (mov.metodoPago ?? '').toLowerCase().includes(term) ||
        String(mov.monto).includes(term) ||
        (mov.ventaId ?? '').toLowerCase().includes(term)
      );
    });
  });

  /**
   * Una venta con varios métodos de pago genera un MovimientoCaja por cada
   * pago (mismo ventaId) — se agrupan en 1 sola fila con todos los métodos.
   * Los movimientos sin ventaId (ingreso/egreso/retiro) quedan uno por fila.
   */
  protected readonly filasCaja = computed(() => {
    const rows: FilaCaja[] = [];
    const indexPorVenta = new Map<string, number>();
    for (const mov of this.movimientosFiltrados()) {
      const monto = Number(mov.monto);
      if (mov.tipo === 'VENTA' && mov.ventaId) {
        const idx = indexPorVenta.get(mov.ventaId);
        if (idx !== undefined) {
          const fila = rows[idx];
          fila.metodos.push({ metodoPago: mov.metodoPago, monto });
          fila.montoTotal += monto;
          continue;
        }
        indexPorVenta.set(mov.ventaId, rows.length);
      }
      rows.push({
        id: mov.id,
        createdAt: mov.createdAt,
        tipo: mov.tipo,
        ventaId: mov.ventaId,
        concepto: mov.concepto,
        metodos: [{ metodoPago: mov.metodoPago, monto }],
        montoTotal: monto,
      });
    }
    return rows;
  });

  private readonly pageSize = 20;
  protected readonly paginaMovimientos = signal(1);
  protected readonly totalPaginasMovimientos = computed(() =>
    Math.max(1, Math.ceil(this.filasCaja().length / this.pageSize)),
  );
  protected readonly paginaActualMovimientos = computed(() =>
    Math.min(this.paginaMovimientos(), this.totalPaginasMovimientos()),
  );
  protected readonly filasCajaPaginadas = computed(() => {
    const inicio = (this.paginaActualMovimientos() - 1) * this.pageSize;
    return this.filasCaja().slice(inicio, inicio + this.pageSize);
  });

  protected readonly paginaHistorial = signal(1);
  protected readonly totalPaginasHistorial = computed(() =>
    Math.max(1, Math.ceil(this.historialFiltrado().length / this.pageSize)),
  );
  protected readonly paginaActualHistorial = computed(() =>
    Math.min(this.paginaHistorial(), this.totalPaginasHistorial()),
  );
  protected readonly historialPaginado = computed(() => {
    const inicio = (this.paginaActualHistorial() - 1) * this.pageSize;
    return this.historialFiltrado().slice(inicio, inicio + this.pageSize);
  });

  protected metodosTexto(fila: FilaCaja): string {
    return fila.metodos.map((m) => m.metodoPago || '—').join(' + ');
  }

  protected ventaCancelada(fila: FilaCaja): boolean {
    if (!fila.ventaId) return false;
    return this.ventasPorId().get(fila.ventaId)?.estado === 'CANCELADA';
  }

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.cajaService.findAllTurnos().subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        const abierto = turnos.find((t) => t.estado === 'ABIERTO');
        if (abierto) {
          this.cargarMovimientos(abierto.id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar la caja');
      },
    });
  }

  private cargarMovimientos(turnoId: string): void {
    this.cajaService.listarMovimientos(turnoId).subscribe((data) => this.movimientos.set(data));
    this.ventasService.findAll().subscribe((ventas) => {
      const deEsteTurno = ventas.filter((v) => v.turnoId === turnoId);
      this.ventasPorId.set(new Map(deEsteTurno.map((v) => [v.id, v])));
    });
  }

  protected verFactura(mov: { ventaId?: string }): void {
    if (!mov.ventaId) return;
    const enCache = this.ventasPorId().get(mov.ventaId);
    if (enCache) {
      this.ventaFactura.set(enCache);
      this.showFactura.set(true);
      return;
    }
    this.ventasService.findOne(mov.ventaId).subscribe({
      next: (venta) => {
        this.ventaFactura.set(venta);
        this.showFactura.set(true);
      },
      error: () => this.toast.error('No se pudo cargar la factura'),
    });
  }

  protected abrirCancelarVenta(fila: FilaCaja): void {
    if (!fila.ventaId) return;
    this.filaCancelar.set(fila);
    this.motivoCancelarVenta.set('');
    this.devolverStockCancelar.set(true);
    this.pinCancelarVenta.set('');
    this.showCancelarVenta.set(true);
  }

  protected confirmarCancelarVenta(): void {
    const fila = this.filaCancelar();
    const turno = this.turnoAbierto();
    if (!fila?.ventaId || !turno) return;
    if (!this.motivoCancelarVenta().trim()) {
      this.toast.error('Ingresa el motivo de la cancelación');
      return;
    }
    if (this.requierePin() && !/^\d{4,6}$/.test(this.pinCancelarVenta())) {
      this.toast.error('Ingresa el PIN de un administrador (4 a 6 dígitos)');
      return;
    }
    this.cancelandoVenta.set(true);
    this.ventasService
      .cancelar(
        fila.ventaId,
        this.motivoCancelarVenta().trim(),
        this.devolverStockCancelar(),
        this.pinCancelarVenta() || undefined,
      )
      .subscribe({
        next: () => {
          this.cancelandoVenta.set(false);
          this.showCancelarVenta.set(false);
          this.toast.success('Venta cancelada');
          this.cargarMovimientos(turno.id);
        },
        error: (err) => {
          this.cancelandoVenta.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo cancelar la venta');
        },
      });
  }

  /** `diferencia` llega como string decimal del backend — nunca comparar sin convertir. */
  protected diferenciaNum(turno: TurnoCaja): number {
    return Number(turno.diferencia ?? 0);
  }

  protected verDetalleTurno(turno: TurnoCaja): void {
    this.turnoDetalle.set(turno);
    this.showDetalleTurno.set(true);
    this.cargandoDetalleTurno.set(true);
    this.ventasDetalleTurno.set([]);
    this.ventasService.findAll().subscribe({
      next: (ventas) => {
        this.ventasDetalleTurno.set(ventas.filter((v) => v.turnoId === turno.id));
        this.cargandoDetalleTurno.set(false);
      },
      error: () => {
        this.cargandoDetalleTurno.set(false);
        this.toast.error('No se pudo cargar el detalle del turno');
      },
    });
  }

  protected abrirPagarDescuadre(turno: TurnoCaja): void {
    this.turnoPagarDescuadre.set(turno);
    this.montoPagarDescuadre.set(Math.abs(this.diferenciaNum(turno)));
    this.showPagarDescuadre.set(true);
  }

  protected confirmarPagarDescuadre(): void {
    const turno = this.turnoPagarDescuadre();
    if (!turno || this.montoPagarDescuadre() <= 0) {
      this.toast.error('Ingresa un monto válido');
      return;
    }
    this.pagandoDescuadre.set(true);
    this.cajaService.pagarDescuadre(turno.id, this.montoPagarDescuadre()).subscribe({
      next: (actualizado) => {
        this.pagandoDescuadre.set(false);
        this.showPagarDescuadre.set(false);
        this.toast.success('Descuadre pagado');
        this.turnos.update((lista) => lista.map((t) => (t.id === actualizado.id ? actualizado : t)));
      },
      error: (err) => {
        this.pagandoDescuadre.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo pagar el descuadre');
      },
    });
  }

  protected abrirModalMovimiento(): void {
    this.tipoMovimiento.set('INGRESO');
    this.montoMovimiento.set(0);
    this.conceptoMovimiento.set('');
    this.showMovimiento.set(true);
  }

  protected registrarMovimiento(): void {
    const turno = this.turnoAbierto();
    if (!turno || this.montoMovimiento() <= 0) {
      this.toast.error('Ingresa un monto válido');
      return;
    }
    this.guardando.set(true);
    this.cajaService
      .registrarMovimiento(turno.id, this.tipoMovimiento(), this.montoMovimiento(), this.conceptoMovimiento() || undefined)
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.showMovimiento.set(false);
          this.toast.success('Movimiento registrado');
          this.cargarMovimientos(turno.id);
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo registrar el movimiento');
        },
      });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
