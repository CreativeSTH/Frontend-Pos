import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/atoms/button/button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { ImageUpload } from '../../../shared/ui/molecules/image-upload/image-upload';
import { TirillaComprobante } from '../../../shared/ui/organisms/tirilla-comprobante/tirilla-comprobante';
import { FormatoImpresionService } from '../../../core/services/formato-impresion.service';
import { NegociosService } from '../../../core/services/negocios.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReciboContenido } from '../../../core/models/recibo-contenido.model';
import { environment } from '../../../../environments/environment';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Un solo formato de impresión por negocio (fase 5b): logo, mensaje de cierre y términos, con vista previa. */
@Component({
  selector: 'app-formato-tab',
  standalone: true,
  imports: [Button, FormField, Input, ImageUpload, TirillaComprobante, FormsModule, RouterLink],
  templateUrl: './formato-tab.html',
  styleUrl: './formato-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormatoTab {
  private readonly formatoService = inject(FormatoImpresionService);
  private readonly negociosService = inject(NegociosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly subiendoLogo = signal(false);
  /** Cambia para recrear `ds-image-upload` y limpiar su selección tras un error (mismo truco que Datos del negocio). */
  protected readonly versionLogo = signal(0);
  protected readonly logoUrl = signal<string | null>(null);
  protected readonly mensajeCierre = signal('');
  protected readonly terminos = signal('');
  private readonly nombreNegocio = signal('Tu negocio');
  private readonly nitNegocio = signal<string | undefined>(undefined);

  protected readonly puedeCambiarLogo = computed(() => this.auth.tienePermiso('NEGOCIO', 'EDITAR'));
  protected readonly puedeEditar = computed(() => this.auth.tienePermiso('FACTURACION', 'EDITAR'));
  protected readonly logoUrlCompleta = computed(() =>
    this.logoUrl() ? `${environment.assetsUrl}${this.logoUrl()}` : null,
  );

  /** Un recibo de ejemplo con el formato actual — lo mismo que verías impreso. */
  protected readonly ejemplo = computed<ReciboContenido>(() => ({
    tipo: 'RECIBO',
    negocio: { nombre: this.nombreNegocio(), nit: this.nitNegocio(), logoUrl: this.logoUrl() ?? undefined },
    emisor: {},
    numero: '1',
    fecha: new Date().toISOString(),
    cliente: 'Consumidor final',
    items: [{ nombre: 'Producto de ejemplo', cantidad: 1, subtotal: 11900, baseImponible: 10000, impuesto: 1900 }],
    subtotal: 10000,
    descuento: 0,
    impuesto: 1900,
    total: 11900,
    pagos: [{ metodo: 'Efectivo', monto: 11900 }],
    mensajeCierre: this.mensajeCierre().trim() || undefined,
    terminos: this.terminos().trim() || undefined,
    leyenda: 'Este documento no es una factura de venta.',
  }));

  constructor() {
    this.formatoService.obtener().subscribe({
      next: (f) => {
        this.logoUrl.set(f.logoUrl);
        this.mensajeCierre.set(f.mensajeCierre ?? '');
        this.terminos.set(f.terminos ?? '');
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el formato de impresión');
      },
    });
    this.negociosService.miNegocio().subscribe({
      next: (n) => {
        this.nombreNegocio.set(n.nombre);
        this.nitNegocio.set(n.nit ?? undefined);
      },
      error: () => {},
    });
  }

  protected guardar(): void {
    this.guardando.set(true);
    this.formatoService
      .actualizar({ mensajeCierre: this.mensajeCierre().trim() || null, terminos: this.terminos().trim() || null })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toast.success('Formato de impresión guardado');
        },
        error: (err) => {
          this.guardando.set(false);
          const mensaje = err.error?.message;
          this.toast.error((Array.isArray(mensaje) ? mensaje[0] : mensaje) ?? 'No se pudo guardar el formato');
        },
      });
  }

  /** `ds-image-upload` emite el archivo elegido, o `null` al tocar la "x" de quitar. */
  protected alElegirLogo(archivo: File | null): void {
    if (!archivo) {
      this.negociosService.quitarLogo().subscribe({
        next: () => this.logoUrl.set(null),
        error: () => this.toast.error('No se pudo quitar el logo'),
      });
      return;
    }
    if (archivo.size > MAX_LOGO_BYTES) {
      this.toast.error('El logo pesa más de 2 MB — elige una imagen más liviana');
      this.versionLogo.update((v) => v + 1);
      return;
    }
    this.subiendoLogo.set(true);
    this.negociosService.subirLogo(archivo).subscribe({
      next: ({ logoUrl }) => {
        this.subiendoLogo.set(false);
        this.logoUrl.set(logoUrl);
        this.toast.success('Logo actualizado');
      },
      error: (err) => {
        this.subiendoLogo.set(false);
        this.versionLogo.update((v) => v + 1);
        this.toast.error(err.error?.message ?? 'No se pudo subir el logo');
      },
    });
  }
}
