import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { StatCard } from '../../../shared/ui/molecules/stat-card/stat-card';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { VerComprobante } from '../../comprobantes/ver-comprobante/ver-comprobante';
import { ComprobantesFacturacionService } from '../../../core/services/comprobantes-facturacion.service';
import { ImpresionComprobanteService } from '../../../core/services/impresion-comprobante.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  FilaComprobante,
  ListadoComprobantes,
  TipoComprobanteListado,
} from '../../../core/models/comprobante-facturacion.model';
import { EstadoDocumentoElectronico } from '../../../core/models/facturacion-electronica.model';
import { etiquetaEstadoDocumento, tonoEstadoDocumento } from '../../facturas-electronicas/estado-documento.util';

const ESTADOS_FILTRO: EstadoDocumentoElectronico[] = ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'PENDIENTE', 'RECHAZADO'];

const TIPOS: { valor: TipoComprobanteListado; etiqueta: string; tono: BadgeTone }[] = [
  { valor: 'FACTURA_ELECTRONICA', etiqueta: 'Factura electrónica', tono: 'info' },
  { valor: 'RECIBO', etiqueta: 'Recibo', tono: 'neutral' },
  { valor: 'RECIBO_CAJA', etiqueta: 'Recibo de caja', tono: 'success' },
  { valor: 'FACTURA', etiqueta: 'Histórico', tono: 'warning' },
];

/** Listado único de comprobantes (spec 6.3) — absorbe el viejo `/facturas-electronicas`. */
@Component({
  selector: 'app-comprobantes-tab',
  standalone: true,
  imports: [
    Button,
    Badge,
    Icon,
    Select,
    Table,
    SearchBar,
    StatCard,
    EmptyState,
    Paginator,
    VerComprobante,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './comprobantes-tab.html',
  styleUrl: './comprobantes-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobantesTab {
  private readonly comprobantes = inject(ComprobantesFacturacionService);
  private readonly impresion = inject(ImpresionComprobanteService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS;
  protected readonly estadosFiltro = ESTADOS_FILTRO;
  protected readonly etiquetaEstado = etiquetaEstadoDocumento;
  protected readonly tonoEstado = tonoEstadoDocumento;

  protected readonly cargando = signal(true);
  protected readonly datos = signal<ListadoComprobantes | null>(null);

  protected readonly tipo = signal<TipoComprobanteListado | ''>('');
  protected readonly estadoDian = signal<EstadoDocumentoElectronico | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(20);

  protected readonly verFila = signal<FilaComprobante | null>(null);
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  /** Referencia estable — `RealtimeService.off` la necesita para desenganchar exactamente este listener. */
  private readonly alCambiarDocumento = () => this.cargar();

  constructor() {
    // Enlaces viejos a /facturas-electronicas?estado=RECHAZADO llegan acá por redirección.
    const estadoInicial = inject(ActivatedRoute).snapshot.queryParamMap.get('estado') as EstadoDocumentoElectronico | null;
    if (estadoInicial && ESTADOS_FILTRO.includes(estadoInicial)) {
      this.tipo.set('FACTURA_ELECTRONICA');
      this.estadoDian.set(estadoInicial);
    }
    this.cargar();

    this.realtime.on('documentos-electronicos:cambio', this.alCambiarDocumento);
    inject(DestroyRef).onDestroy(() => {
      this.realtime.off('documentos-electronicos:cambio', this.alCambiarDocumento);
      if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    });
  }

  protected cargar(): void {
    this.comprobantes
      .listar({
        tipo: this.tipo() || undefined,
        estadoDian: this.estadoDian() || undefined,
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
          this.toast.error(err.error?.message ?? 'No se pudieron cargar los comprobantes');
        },
      });
  }

  protected filtrarPorTipo(tipo: TipoComprobanteListado | ''): void {
    this.tipo.set(tipo);
    // El estado DIAN solo tiene sentido para facturas electrónicas.
    if (tipo !== 'FACTURA_ELECTRONICA') this.estadoDian.set('');
    this.reiniciarYCargar();
  }

  protected filtrarPorEstado(estado: EstadoDocumentoElectronico | ''): void {
    this.estadoDian.set(estado);
    if (estado) this.tipo.set('FACTURA_ELECTRONICA');
    this.reiniciarYCargar();
  }

  protected cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    this[campo].set(valor);
    this.reiniciarYCargar();
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.reiniciarYCargar(), 350);
  }

  protected irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cambiarPorPagina(porPagina: number): void {
    this.porPagina.set(porPagina);
    this.reiniciarYCargar();
  }

  protected totalPaginas(): number {
    const d = this.datos();
    return d ? Math.max(1, Math.ceil(d.total / d.porPagina)) : 1;
  }

  protected tipoDe(fila: FilaComprobante) {
    return TIPOS.find((t) => t.valor === fila.tipo)!;
  }

  protected imprimirReciboCaja(fila: FilaComprobante): void {
    // Reimpresión: nunca abre el cajón (el dinero ya entró cuando se registró el abono).
    if (fila.abonoId) this.impresion.imprimirAbono(fila.abonoId, { abrirCajon: false }).subscribe();
  }

  protected cerrarVer(): void {
    this.verFila.set(null);
    this.cargar();
  }

  protected formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
  }

  private reiniciarYCargar(): void {
    this.pagina.set(1);
    this.cargar();
  }
}
