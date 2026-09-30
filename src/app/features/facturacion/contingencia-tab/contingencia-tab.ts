import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Input } from '../../../shared/ui/atoms/input/input';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { ContingenciaService } from '../../../core/services/contingencia.service';
import { FacturacionElectronicaService } from '../../../core/services/facturacion-electronica.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EstadoContingencia, PeriodoContingencia } from '../../../core/models/contingencia.model';
import { DocumentoElectronico } from '../../../core/models/facturacion-electronica.model';
import { BadgeTone } from '../../../shared/ui/atoms/badge/badge';

const CORREO_DIAN = 'contingencia.facturadorvp@dian.gov.co';

/**
 * Contingencia de facturación (fase 6a): resolución de papel, declarar/terminar, carta a la DIAN y la
 * lista de facturas de papel con su estado ante la DIAN. Se refresca por realtime.
 */
@Component({
  selector: 'app-contingencia-tab',
  standalone: true,
  imports: [Button, Badge, Input, FormField, Modal, FormsModule],
  templateUrl: './contingencia-tab.html',
  styleUrl: './contingencia-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContingenciaTab {
  private readonly contingencia = inject(ContingenciaService);
  private readonly facturacion = inject(FacturacionElectronicaService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly correoDian = CORREO_DIAN;
  protected readonly estado = signal<EstadoContingencia | null>(null);
  protected readonly documentos = signal<DocumentoElectronico[]>([]);
  protected readonly puedeEditar = computed(() => this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'EDITAR'));
  protected readonly procesando = signal(false);

  // Resolución
  protected readonly editandoResolucion = signal(false);
  protected readonly resNumero = signal('');
  protected readonly resPrefijo = signal('');
  protected readonly resFechaInicio = signal('');
  protected readonly resFechaFin = signal('');
  protected readonly resDesde = signal<number | null>(null);
  protected readonly resHasta = signal<number | null>(null);

  // Declarar
  protected readonly mostrandoDeclarar = signal(false);
  protected readonly motivo = signal('');
  protected readonly inicioPasado = signal('');

  /** Períodos para los que se ofrece la carta: el activo y el último cerrado. */
  protected readonly periodosConCarta = computed(() => {
    const e = this.estado();
    if (!e) return [];
    const ultimoCerrado = e.periodos.find((p) => p.fin);
    return [e.activa, ultimoCerrado].filter((p): p is PeriodoContingencia => !!p);
  });

  private readonly alCambiar = () => this.cargar();

  constructor() {
    this.cargar();
    this.realtime.on('contingencia:cambio', this.alCambiar);
    this.realtime.on('documentos-electronicos:cambio', this.alCambiar);
    inject(DestroyRef).onDestroy(() => {
      this.realtime.off('contingencia:cambio', this.alCambiar);
      this.realtime.off('documentos-electronicos:cambio', this.alCambiar);
    });
  }

  private cargar(): void {
    this.contingencia.estado().subscribe({
      next: (e) => this.estado.set(e),
      error: (err) => this.error(err, 'No se pudo cargar la contingencia'),
    });
    this.contingencia.documentos().subscribe({ next: (docs) => this.documentos.set(docs), error: () => undefined });
  }

  private error(err: { error?: { message?: string | string[] } }, porDefecto: string): void {
    const mensaje = err.error?.message;
    this.toast.error((Array.isArray(mensaje) ? mensaje[0] : mensaje) ?? porDefecto);
  }

  // ---------- Resolución ----------

  protected editarResolucion(): void {
    const r = this.estado()?.resolucion;
    this.resNumero.set(r?.numero ?? '');
    this.resPrefijo.set(r?.prefijo ?? '');
    this.resFechaInicio.set(r?.fechaInicio ?? '');
    this.resFechaFin.set(r?.fechaFin ?? '');
    this.resDesde.set(r?.rangoDesde ?? null);
    this.resHasta.set(r?.rangoHasta ?? null);
    this.editandoResolucion.set(true);
  }

  protected guardarResolucion(): void {
    const desde = Number(this.resDesde());
    const hasta = Number(this.resHasta());
    if (!this.resNumero().trim() || !this.resPrefijo().trim() || !this.resFechaInicio() || !this.resFechaFin() || !desde || !hasta) {
      this.toast.error('Completa todos los datos de la resolución');
      return;
    }
    this.procesando.set(true);
    this.contingencia
      .cargarResolucion({
        numero: this.resNumero().trim(),
        prefijo: this.resPrefijo().trim(),
        fechaInicio: this.resFechaInicio(),
        fechaFin: this.resFechaFin(),
        rangoDesde: desde,
        rangoHasta: hasta,
      })
      .subscribe({
        next: (e) => {
          this.procesando.set(false);
          this.estado.set(e);
          this.editandoResolucion.set(false);
          this.toast.success('Resolución de contingencia guardada');
        },
        error: (err) => {
          this.procesando.set(false);
          this.error(err, 'No se pudo guardar la resolución');
        },
      });
  }

  // ---------- Declarar / terminar ----------

  protected abrirDeclarar(): void {
    this.motivo.set('');
    this.inicioPasado.set('');
    this.mostrandoDeclarar.set(true);
  }

  protected declarar(): void {
    if (!this.motivo().trim()) {
      this.toast.error('Escribe el motivo');
      return;
    }
    this.procesando.set(true);
    const inicio = this.inicioPasado() ? new Date(this.inicioPasado()).toISOString() : undefined;
    this.contingencia.declarar({ motivo: this.motivo().trim(), inicio }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mostrandoDeclarar.set(false);
        this.toast.success('Contingencia declarada: las ventas salen como factura de papel');
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error(err, 'No se pudo declarar la contingencia');
      },
    });
  }

  protected async terminar(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Terminar contingencia',
      message:
        '¿Ya se solucionó? Al terminarla, AURA empieza a enviar las facturas de papel a la DIAN. Tienes 48 horas para que queden aceptadas.',
      confirmLabel: 'Terminar',
    });
    if (!ok) return;
    this.procesando.set(true);
    this.contingencia.finalizar().subscribe({
      next: () => {
        this.procesando.set(false);
        this.toast.success('Contingencia terminada. Descarga la carta de fin para la DIAN.');
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error(err, 'No se pudo terminar la contingencia');
      },
    });
  }

  // ---------- Aviso a la DIAN ----------

  protected descargarCarta(periodo: PeriodoContingencia, tipo: 'INICIO' | 'FIN'): void {
    this.contingencia.carta(periodo.id, tipo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `carta-contingencia-${tipo.toLowerCase()}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.error(err, 'No se pudo generar la carta'),
    });
  }

  protected marcarAviso(periodo: PeriodoContingencia, tipo: 'INICIO' | 'FIN'): void {
    this.contingencia.marcarAviso(periodo.id, tipo).subscribe({
      next: () => this.cargar(),
      error: (err) => this.error(err, 'No se pudo registrar el aviso'),
    });
  }

  // ---------- Facturas ----------

  protected reintentar(doc: DocumentoElectronico): void {
    this.facturacion.reintentarFactura(doc.id).subscribe({
      next: () => this.cargar(),
      error: (err) => this.error(err, 'No se pudo reintentar'),
    });
  }

  private periodoAbierto(doc: DocumentoElectronico): boolean {
    return this.estado()?.activa?.id === doc.periodoContingenciaId;
  }

  protected etiquetaEstado(doc: DocumentoElectronico): string {
    switch (doc.estado) {
      case 'ACEPTADO':
      case 'ACEPTADO_CON_OBSERVACIONES':
        return 'Aceptada por la DIAN';
      case 'RECHAZADO':
        return 'Rechazada';
      case 'ERROR':
        return 'Error al enviar';
      default:
        return this.periodoAbierto(doc) ? 'Espera el fin de la contingencia' : 'Enviando a la DIAN';
    }
  }

  protected tonoEstado(doc: DocumentoElectronico): BadgeTone {
    if (doc.estado === 'ACEPTADO' || doc.estado === 'ACEPTADO_CON_OBSERVACIONES') return 'success';
    if (doc.estado === 'RECHAZADO' || doc.estado === 'ERROR') return 'danger';
    return this.periodoAbierto(doc) ? 'neutral' : 'warning';
  }

  protected puedeReintentar(doc: DocumentoElectronico): boolean {
    return this.puedeEditar() && (doc.estado === 'RECHAZADO' || doc.estado === 'ERROR');
  }

  protected etiquetaOrigen(origen: PeriodoContingencia['origen']): string {
    return origen === 'AUTOMATICA' ? 'Automática' : origen === 'SIN_CONEXION' ? 'Sin conexión en la caja' : 'Manual';
  }

  /** Talonario escrito a mano, vendida sin conexión (6b) o impresa por AURA con el backend arriba (6a). */
  protected origenFactura(doc: DocumentoElectronico): string {
    if (doc.transcritaDeTalonario) return 'Talonario';
    const periodo = this.estado()?.periodos.find((p) => p.id === doc.periodoContingenciaId);
    return periodo?.origen === 'SIN_CONEXION' ? 'Vendida sin conexión' : 'Impresa por AURA';
  }

  protected fechaHora(valor: string | null | undefined): string {
    return valor
      ? new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })
      : '—';
  }

  protected formatMoney(valor: number | string | undefined): string {
    return Number(valor ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }
}
