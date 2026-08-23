import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { AlertasService } from '../../../core/services/alertas.service';
import { ListaPedidosService } from '../../../core/services/lista-pedidos.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import {
  Alerta,
  ReglaAlerta,
  ResumenAlertas,
  SeveridadAlerta,
  TipoAlerta,
  TipoCondicionAlerta,
} from '../../../core/models/alerta.model';

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  STOCK_BAJO: 'Stock bajo',
  PRODUCTO_AGOTADO: 'Producto agotado',
  CUOTA_POR_VENCER: 'Cuota por vencer',
  CUOTA_VENCIDA: 'Cuota vencida',
  CLIENTE_LIMITE_CREDITO: 'Límite de crédito',
  VENTA_EN_MORA: 'Venta en mora',
  META_VENTAS_NO_ALCANZADA: 'Meta de ventas no alcanzada',
  PERSONALIZADA: 'Personalizada',
  REGLA: 'Regla personalizada',
};

const TONOS_SEVERIDAD: Record<SeveridadAlerta, BadgeTone> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  CRITICA: 'danger',
};

interface CondicionInfo {
  value: TipoCondicionAlerta;
  label: string;
  labelValor: string;
  sufijo: string;
}

const CONDICIONES: CondicionInfo[] = [
  {
    value: 'LISTA_PEDIDOS_SIN_RESOLVER',
    label: 'Un ítem lleva mucho tiempo pendiente en la lista de pedidos',
    labelValor: 'Horas sin resolver',
    sufijo: 'h',
  },
  {
    value: 'TURNO_ABIERTO_MUCHO_TIEMPO',
    label: 'Un turno de caja lleva mucho tiempo abierto',
    labelValor: 'Horas abierto',
    sufijo: 'h',
  },
  {
    value: 'DESCUADRE_SIN_PAGAR',
    label: 'Un descuadre de cierre lleva días sin pagarse',
    labelValor: 'Días sin pagar',
    sufijo: 'd',
  },
];

/** Refresco silencioso en segundo plano — mismo motivo que el polling de la campana. */
const POLL_MS = 30_000;

@Component({
  selector: 'app-alertas-list',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    Table,
    Select,
    Switch,
    Modal,
    FormField,
    Input,
    StatCard,
    EmptyState,
    Paginator,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './alertas-list.html',
  styleUrl: './alertas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasList {
  private readonly alertasService = inject(AlertasService);
  private readonly listaPedidosService = inject(ListaPedidosService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly alertas = signal<Alerta[]>([]);
  protected readonly resumen = signal<ResumenAlertas | null>(null);
  protected readonly generando = signal(false);

  protected readonly filtroTipo = signal<TipoAlerta | ''>('');
  protected readonly filtroSeveridad = signal<SeveridadAlerta | ''>('');
  protected readonly filtroResuelta = signal<'' | 'true' | 'false'>('false');

  protected readonly etiquetasTipo = ETIQUETAS_TIPO;
  protected readonly tiposAlerta = Object.keys(ETIQUETAS_TIPO) as TipoAlerta[];

  protected readonly showNuevaAlerta = signal(false);
  protected readonly nuevaSeveridad = signal<SeveridadAlerta>('MEDIA');
  protected readonly nuevoMensaje = signal('');
  protected readonly nuevaActiva = signal(true);
  protected readonly creandoAlerta = signal(false);

  protected readonly condiciones = CONDICIONES;
  protected readonly reglas = signal<ReglaAlerta[]>([]);
  protected readonly showNuevaRegla = signal(false);
  protected readonly nuevaReglaNombre = signal('');
  protected readonly nuevaReglaCondicion = signal<TipoCondicionAlerta>('LISTA_PEDIDOS_SIN_RESOLVER');
  protected readonly nuevaReglaValor = signal(24);
  protected readonly nuevaReglaSeveridad = signal<SeveridadAlerta>('MEDIA');
  protected readonly creandoRegla = signal(false);

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

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.alertasFiltradas().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly alertasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.alertasFiltradas().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
    this.cargarReglas();
    const intervalId = setInterval(() => this.load(true), POLL_MS);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  private cargarReglas(): void {
    this.alertasService.findReglas().subscribe((reglas) => this.reglas.set(reglas));
  }

  protected infoCondicion(tipo: TipoCondicionAlerta): CondicionInfo {
    return this.condiciones.find((c) => c.value === tipo) ?? this.condiciones[0];
  }

  protected abrirNuevaRegla(): void {
    this.nuevaReglaNombre.set('');
    this.nuevaReglaCondicion.set('LISTA_PEDIDOS_SIN_RESOLVER');
    this.nuevaReglaValor.set(24);
    this.nuevaReglaSeveridad.set('MEDIA');
    this.showNuevaRegla.set(true);
  }

  protected crearRegla(): void {
    if (!this.nuevaReglaNombre().trim()) {
      this.toast.error('Ponle un nombre a la regla');
      return;
    }
    if (this.nuevaReglaValor() <= 0) {
      this.toast.error('El valor debe ser mayor a 0');
      return;
    }
    this.creandoRegla.set(true);
    this.alertasService
      .crearRegla({
        nombre: this.nuevaReglaNombre().trim(),
        tipoCondicion: this.nuevaReglaCondicion(),
        valor: this.nuevaReglaValor(),
        severidad: this.nuevaReglaSeveridad(),
      })
      .subscribe({
        next: () => {
          this.creandoRegla.set(false);
          this.showNuevaRegla.set(false);
          this.toast.success('Regla creada — se evalúa en la próxima corrida (o apretando "Actualizar")');
          this.cargarReglas();
        },
        error: (err) => {
          this.creandoRegla.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo crear la regla');
        },
      });
  }

  protected alternarReglaActiva(regla: ReglaAlerta, activa: boolean): void {
    this.alertasService.actualizarRegla(regla.id, { activa }).subscribe({
      next: (actualizada) => {
        this.reglas.update((lista) => lista.map((r) => (r.id === actualizada.id ? actualizada : r)));
      },
      error: () => this.toast.error('No se pudo actualizar la regla'),
    });
  }

  protected async eliminarRegla(regla: ReglaAlerta): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar la regla "${regla.nombre}"?`, danger: true }))) return;
    this.alertasService.eliminarRegla(regla.id).subscribe({
      next: () => {
        this.reglas.update((lista) => lista.filter((r) => r.id !== regla.id));
        this.toast.success('Regla eliminada');
      },
      error: () => this.toast.error('No se pudo eliminar la regla'),
    });
  }

  /** `silencioso` evita el parpadeo del spinner en los refrescos automáticos de fondo. */
  private load(silencioso = false): void {
    if (!silencioso) this.loading.set(true);
    this.alertasService.findAll().subscribe({
      next: (alertas) => {
        this.alertas.set(alertas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (!silencioso) this.toast.error('No se pudieron cargar las alertas');
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

  protected esAlertaDeStock(alerta: Alerta): boolean {
    return (alerta.tipo === 'STOCK_BAJO' || alerta.tipo === 'PRODUCTO_AGOTADO') && !!alerta.productoId;
  }

  protected agregarAListaPedidos(alerta: Alerta): void {
    if (!alerta.productoId) return;
    this.listaPedidosService.agregar(alerta.productoId).subscribe({
      next: () => this.toast.success('Agregado a la lista de pedidos'),
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo agregar a la lista de pedidos'),
    });
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

  protected alternarActiva(alerta: Alerta, activa: boolean): void {
    this.alertasService.alternarActiva(alerta.id, activa).subscribe({
      next: (actualizada) => {
        this.alertas.update((lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a)));
        this.alertasService.refrescarConteo().subscribe();
      },
      error: () => this.toast.error('No se pudo actualizar la alerta'),
    });
  }

  protected abrirNuevaAlerta(): void {
    this.nuevaSeveridad.set('MEDIA');
    this.nuevoMensaje.set('');
    this.nuevaActiva.set(true);
    this.showNuevaAlerta.set(true);
  }

  protected crearAlerta(): void {
    if (!this.nuevoMensaje().trim()) {
      this.toast.error('Escribe un mensaje para la alerta');
      return;
    }
    this.creandoAlerta.set(true);
    this.alertasService
      .crear({ severidad: this.nuevaSeveridad(), mensaje: this.nuevoMensaje().trim(), activa: this.nuevaActiva() })
      .subscribe({
        next: () => {
          this.creandoAlerta.set(false);
          this.showNuevaAlerta.set(false);
          this.toast.success('Alerta creada');
          this.load();
          this.alertasService.refrescarConteo().subscribe();
        },
        error: (err) => {
          this.creandoAlerta.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo crear la alerta');
        },
      });
  }
}
