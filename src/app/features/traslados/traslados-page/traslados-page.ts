import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { TrasladosService } from '../../../core/services/traslados.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Bodega } from '../../../core/models/bodega.model';
import {
  ETIQUETA_ESTADO_TRASLADO,
  EstadoTraslado,
  FiltrosTraslados,
  Traslado,
  TrasladoItem,
  etiquetaTraslado,
} from '../../../core/models/traslado.model';
import { NuevoTrasladoModal } from '../nuevo-traslado-modal/nuevo-traslado-modal';
import { RecibirTrasladoModal } from '../recibir-traslado-modal/recibir-traslado-modal';

type Pestana = 'transito' | 'historial';

/**
 * Traslados entre bodegas (spec 2026-10-04 §8). Dos pestañas: "En tránsito" y "Historial" — no hay
 * "Por recibir"/"Enviados" porque quien puede enviar ve todo el negocio y ahí "mis bodegas" no existe.
 */
@Component({
  selector: 'app-traslados-page',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Icon,
    Select,
    Table,
    Modal,
    EmptyState,
    EnlaceAyuda,
    Paginator,
    FormsModule,
    DatePipe,
    DecimalPipe,
    NuevoTrasladoModal,
    RecibirTrasladoModal,
  ],
  templateUrl: './traslados-page.html',
  styleUrl: './traslados-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrasladosPage {
  private readonly trasladosService = inject(TrasladosService);
  private readonly bodegasService = inject(BodegasService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);

  protected readonly etiqueta = etiquetaTraslado;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_TRASLADO;
  protected readonly puedeEnviar = this.auth.tienePermiso('TRASLADOS', 'CREAR');
  protected readonly puedeRecibir = this.auth.tienePermiso('TRASLADOS', 'EDITAR');
  protected readonly puedeCancelar = this.auth.tienePermiso('TRASLADOS', 'ELIMINAR');

  protected readonly pestana = signal<Pestana>('transito');
  protected readonly cargando = signal(true);
  protected readonly enTransito = signal<Traslado[]>([]);
  protected readonly historial = signal<Traslado[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly filtros = signal<FiltrosTraslados>({});

  protected readonly mostrarNuevo = signal(false);
  protected readonly aRecibir = signal<Traslado | null>(null);
  protected readonly enDetalle = signal<Traslado | null>(null);

  protected readonly lista = computed(() => (this.pestana() === 'transito' ? this.enTransito() : this.historial()));
  protected readonly pag = usePaginacion(this.lista);

  constructor() {
    this.bodegasService.findAll().subscribe((b) => this.bodegas.set(b));
    this.cargarEnTransito();
    const ver = this.route.snapshot.queryParamMap.get('ver');
    if (ver) this.verDetalle(ver);
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    this.pag.pagina.set(1);
    if (p === 'historial') this.cargarHistorial();
  }

  protected actualizarFiltro(campo: keyof FiltrosTraslados, valor: string): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor || undefined }));
    this.cargarHistorial();
  }

  protected tonoEstado(estado: EstadoTraslado): BadgeTone {
    if (estado === 'EN_TRANSITO') return 'warning';
    return estado === 'RECIBIDO' ? 'success' : 'neutral';
  }

  protected totalUnidades(t: Traslado): number {
    return t.items.reduce((s, i) => s + Number(i.cantidadEnviada), 0);
  }

  protected faltante(item: TrasladoItem): number {
    return item.cantidadRecibida === null ? 0 : Number(item.cantidadEnviada) - Number(item.cantidadRecibida);
  }

  protected verDetalle(id: string): void {
    this.trasladosService.detalle(id).subscribe({
      next: (t) => this.enDetalle.set(t),
      error: () => this.toast.error('No se pudo cargar el traslado'),
    });
  }

  protected alEnviar(t: Traslado): void {
    this.mostrarNuevo.set(false);
    this.toast.success(`Traslado ${etiquetaTraslado(t.consecutivo)} enviado`);
    this.pestana.set('transito');
    this.cargarEnTransito();
  }

  protected alRecibir(t: Traslado): void {
    this.aRecibir.set(null);
    this.toast.success(`Traslado ${etiquetaTraslado(t.consecutivo)} recibido`);
    this.cargarEnTransito();
  }

  protected async cancelar(t: Traslado): Promise<void> {
    const ok = await this.confirm.ask({
      message: `¿Cancelar el traslado ${etiquetaTraslado(t.consecutivo)}? Toda la mercancía vuelve a ${t.bodegaOrigen?.nombre ?? 'la bodega de origen'}.`,
      danger: true,
    });
    if (!ok) return;
    this.trasladosService.cancelar(t.id).subscribe({
      next: () => {
        this.toast.success(`Traslado ${etiquetaTraslado(t.consecutivo)} cancelado`);
        this.cargarEnTransito();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo cancelar el traslado'),
    });
  }

  private cargarEnTransito(): void {
    this.cargando.set(true);
    this.trasladosService.listar({ estado: 'EN_TRANSITO' }).subscribe({
      next: (lista) => {
        this.enTransito.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los traslados');
      },
    });
  }

  private cargarHistorial(): void {
    this.cargando.set(true);
    this.trasladosService.listar(this.filtros()).subscribe({
      next: (lista) => {
        this.historial.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los traslados');
      },
    });
  }
}
