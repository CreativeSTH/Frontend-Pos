import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ImpresionComprobanteService } from '../../../core/services/impresion-comprobante.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Input } from '../../../shared/ui/atoms/input/input';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { FacturacionElectronicaService } from '../../../core/services/facturacion-electronica.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { DetalleFactura, DocumentoElectronico } from '../../../core/models/facturacion-electronica.model';
import { etiquetaEstadoDocumento, tonoEstadoDocumento } from '../estado-documento.util';

/**
 * Detalle de una factura electrónica (CUFE, QR, errores DIAN, venta, PDF y XML). Reutilizable:
 * lo abren tanto `/facturas-electronicas` como el detalle de una venta en `/ventas`.
 */
@Component({
  selector: 'app-factura-detalle',
  standalone: true,
  imports: [Modal, Button, Badge, Icon, Table, Input, FormField, FormsModule, DatePipe],
  templateUrl: './factura-detalle.html',
  styleUrl: './factura-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaDetalle {
  private readonly facturacion = inject(FacturacionElectronicaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly impresion = inject(ImpresionComprobanteService);

  readonly documentoId = input.required<string>();
  readonly close = output<void>();
  readonly cambio = output<DocumentoElectronico>();

  protected readonly cargando = signal(true);
  protected readonly detalle = signal<DetalleFactura | null>(null);
  protected readonly reintentando = signal(false);
  protected readonly cargandoPdf = signal(false);
  protected readonly descargandoXml = signal(false);
  protected readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private urlObjetoPdf: string | null = null;

  protected readonly etiqueta = etiquetaEstadoDocumento;
  protected readonly tono = tonoEstadoDocumento;

  protected readonly documento = computed(() => this.detalle()?.documento ?? null);
  protected readonly puedeVerPdf = computed(() => {
    const d = this.documento();
    return !!d && d.tipo === 'FACTURA' && !!d.cufe;
  });
  /** Mismo criterio que el backend (`exigirReintentable`) — el botón no aparece donde el backend respondería 400. */
  protected readonly puedeReintentar = computed(() => {
    const d = this.documento();
    if (!d || !this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'EDITAR')) return false;
    return d.estado === 'RECHAZADO' || d.estado === 'ERROR' || (d.estado === 'PENDIENTE' && !d.trackingReference);
  });

  // ── Fase 7: correo al cliente ──
  protected readonly formCorreoAbierto = signal(false);
  protected readonly correoDestino = signal('');
  protected readonly enviandoCorreo = signal(false);
  /** Mismo criterio que el backend (`enviarCorreoFactura`): solo una factura aceptada por la DIAN. */
  protected readonly puedeEnviarCorreo = computed(() => {
    const d = this.documento();
    if (!d || !this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'EDITAR')) return false;
    return d.tipo === 'FACTURA' && (d.estado === 'ACEPTADO' || d.estado === 'ACEPTADO_CON_OBSERVACIONES');
  });

  constructor() {
    effect(() => this.cargar(this.documentoId()));
    inject(DestroyRef).onDestroy(() => this.liberarPdf());
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.facturacion.obtenerFactura(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cargar la factura');
      },
    });
  }

  protected numero(valor: number | string | undefined | null): number {
    return Number(valor ?? 0);
  }

  protected formatMoney(valor: number | string | undefined | null): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(
      Number(valor ?? 0),
    );
  }

  protected async copiarCufe(): Promise<void> {
    const cufe = this.documento()?.cufe;
    if (!cufe) return;
    try {
      await navigator.clipboard.writeText(cufe);
      this.toast.success('CUFE copiado');
    } catch {
      this.toast.error('No se pudo copiar — seleccioná el texto a mano');
    }
  }

  protected reintentar(): void {
    const d = this.documento();
    if (!d) return;
    this.reintentando.set(true);
    this.facturacion.reintentarFactura(d.id).subscribe({
      next: (actualizado) => {
        this.reintentando.set(false);
        this.toast.success('Factura reenviada a la DIAN');
        this.cambio.emit(actualizado);
        this.cargar(d.id);
      },
      error: (err) => {
        this.reintentando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo reintentar la factura');
      },
    });
  }

  protected abrirFormCorreo(): void {
    const det = this.detalle();
    this.correoDestino.set(det?.venta?.cliente?.email ?? det?.documento.correoDestinatario ?? '');
    this.formCorreoAbierto.set(true);
  }

  protected enviarCorreo(): void {
    const d = this.documento();
    const correo = this.correoDestino().trim();
    if (!d || !correo) return;
    this.enviandoCorreo.set(true);
    this.facturacion.enviarCorreoFactura(d.id, correo).subscribe({
      next: (actualizado) => {
        this.enviandoCorreo.set(false);
        this.formCorreoAbierto.set(false);
        if (actualizado.correoEstado === 'ENVIADO') this.toast.success(`Factura enviada a ${correo}`);
        else this.toast.error(actualizado.correoError ?? 'No se pudo enviar el correo');
        this.cambio.emit(actualizado);
        this.cargar(d.id);
      },
      error: (err) => {
        this.enviandoCorreo.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo enviar el correo');
      },
    });
  }

  protected verPdf(): void {
    const d = this.documento();
    if (!d) return;
    this.cargandoPdf.set(true);
    this.facturacion.descargarPdf(d.id).subscribe({
      next: (blob) => {
        this.cargandoPdf.set(false);
        this.liberarPdf();
        this.urlObjetoPdf = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlObjetoPdf));
      },
      error: () => {
        this.cargandoPdf.set(false);
        this.toast.error('No se pudo generar el PDF — si la factura es reciente, esperá la respuesta de la DIAN');
      },
    });
  }

  protected descargarPdfActual(): void {
    if (!this.urlObjetoPdf) return;
    this.dispararDescarga(this.urlObjetoPdf, `${this.documento()?.numeroCompleto ?? 'factura'}.pdf`);
  }

  protected descargarXml(): void {
    const d = this.documento();
    if (!d) return;
    this.descargandoXml.set(true);
    this.facturacion.descargarXml(d.id).subscribe({
      next: (blob) => {
        this.descargandoXml.set(false);
        const url = URL.createObjectURL(blob);
        this.dispararDescarga(url, `${d.numeroCompleto ?? d.id}.xml`);
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargandoXml.set(false);
        this.toast.error('No se pudo obtener el documento de Alegra, intentá en unos minutos');
      },
    });
  }

  protected readonly imprimiendoTirilla = signal(false);

  protected imprimirTirilla(): void {
    const ventaId = this.documento()?.ventaId;
    if (!ventaId) return;
    this.imprimiendoTirilla.set(true);
    this.impresion.imprimir(ventaId).subscribe(() => this.imprimiendoTirilla.set(false));
  }

  protected verVenta(): void {
    const ventaId = this.documento()?.ventaId;
    if (!ventaId) return;
    this.close.emit();
    this.router.navigate(['/ventas'], { queryParams: { venta: ventaId } });
  }

  protected cerrarPdf(): void {
    this.pdfUrl.set(null);
    this.liberarPdf();
  }

  private dispararDescarga(url: string, nombre: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
  }

  private liberarPdf(): void {
    if (this.urlObjetoPdf) URL.revokeObjectURL(this.urlObjetoPdf);
    this.urlObjetoPdf = null;
  }
}
