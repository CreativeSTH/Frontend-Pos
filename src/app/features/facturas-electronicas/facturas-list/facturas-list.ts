import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { FacturacionElectronicaService } from '../../../core/services/facturacion-electronica.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DocumentoElectronico,
  EstadoDocumentoElectronico,
  ListadoFacturas,
} from '../../../core/models/facturacion-electronica.model';
import { etiquetaEstadoDocumento, tonoEstadoDocumento } from '../estado-documento.util';
import { FacturaDetalle } from '../factura-detalle/factura-detalle';

const ESTADOS_FILTRO: EstadoDocumentoElectronico[] = ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'PENDIENTE', 'RECHAZADO'];

@Component({
  selector: 'app-facturas-list',
  standalone: true,
  imports: [
    Topbar, Button, Badge, Icon, Select, Table, SearchBar, StatCard, EmptyState, Paginator,
    FacturaDetalle, FormsModule, DatePipe, RouterLink,
  ],
  templateUrl: './facturas-list.html',
  styleUrl: './facturas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturasList {
  private readonly facturacion = inject(FacturacionElectronicaService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);

  protected readonly estadosFiltro = ESTADOS_FILTRO;
  protected readonly etiqueta = etiquetaEstadoDocumento;
  protected readonly tono = tonoEstadoDocumento;

  protected readonly cargando = signal(true);
  protected readonly datos = signal<ListadoFacturas | null>(null);
  protected readonly habilitado = signal(true);

  protected readonly estado = signal<EstadoDocumentoElectronico | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);

  protected readonly detalleId = signal<string | null>(null);
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  /** Referencia estable — `RealtimeService.off` la necesita para desenganchar exactamente este listener. */
  private readonly alCambiarDocumento = () => this.cargar();

  constructor() {
    const estadoInicial = inject(ActivatedRoute).snapshot.queryParamMap.get('estado') as EstadoDocumentoElectronico | null;
    if (estadoInicial && ESTADOS_FILTRO.includes(estadoInicial)) this.estado.set(estadoInicial);

    this.facturacion.miHabilitacion().subscribe({
      next: (h) => this.habilitado.set(h.estado === 'HABILITADO'),
      error: () => this.habilitado.set(false),
    });
    this.cargar();

    this.realtime.on('documentos-electronicos:cambio', this.alCambiarDocumento);
    inject(DestroyRef).onDestroy(() => {
      this.realtime.off('documentos-electronicos:cambio', this.alCambiarDocumento);
      if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    });
  }

  protected cargar(): void {
    this.facturacion
      .listarFacturas({
        estado: this.estado() || undefined,
        desde: this.desde() || undefined,
        hasta: this.hasta() || undefined,
        q: this.busqueda().trim() || undefined,
        pagina: this.pagina(),
        porPagina: this.porPagina(),
      })
      .subscribe({
        next: (datos) => {
          this.datos.set(datos);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudieron cargar las facturas');
        },
      });
  }

  protected filtrarPorEstado(estado: EstadoDocumentoElectronico | ''): void {
    this.estado.set(estado);
    this.pagina.set(1);
    this.cargar();
  }

  protected cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    this[campo].set(valor);
    this.pagina.set(1);
    this.cargar();
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => {
      this.pagina.set(1);
      this.cargar();
    }, 350);
  }

  protected irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cambiarPorPagina(porPagina: number): void {
    this.porPagina.set(porPagina);
    this.pagina.set(1);
    this.cargar();
  }

  protected totalPaginas(): number {
    const d = this.datos();
    return d ? Math.max(1, Math.ceil(d.total / d.porPagina)) : 1;
  }

  protected formatMoney(valor: number | string | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(valor ?? 0));
  }

  protected alCambiarDetalle(_documento: DocumentoElectronico): void {
    this.cargar();
  }
}
