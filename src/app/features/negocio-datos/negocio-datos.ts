import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../layout/topbar/topbar';
import { Button } from '../../shared/ui/atoms/button/button';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Input } from '../../shared/ui/atoms/input/input';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { ImageUpload } from '../../shared/ui/molecules/image-upload/image-upload';
import { NegociosService } from '../../core/services/negocios.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Negocio } from '../../core/models/negocio.model';
import { environment } from '../../../environments/environment';

/** Mismo límite que `negocioLogoUploadOptions` del backend — se valida acá para no depender del mensaje en inglés de multer. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-negocio-datos',
  standalone: true,
  imports: [Topbar, Button, Icon, Input, FormField, ImageUpload, FormsModule],
  templateUrl: './negocio-datos.html',
  styleUrl: './negocio-datos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NegocioDatos {
  private readonly negociosService = inject(NegociosService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly negocio = signal<Negocio | null>(null);
  protected readonly subiendoLogo = signal(false);
  /**
   * `ds-image-upload` guarda su propia vista previa local del archivo elegido; si la subida falla,
   * incrementar esto recrea el componente para que no siga mostrando un logo que no se guardó.
   */
  protected readonly versionLogo = signal(0);

  protected readonly nombre = signal('');
  protected readonly nit = signal('');
  protected readonly tipoNegocio = signal('');
  protected readonly email = signal('');
  protected readonly telefono = signal('');
  protected readonly direccion = signal('');

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.negociosService.miNegocio().subscribe({
      next: (negocio) => {
        this.negocio.set(negocio);
        this.nombre.set(negocio.nombre);
        this.nit.set(negocio.nit ?? '');
        this.tipoNegocio.set(negocio.tipoNegocio ?? '');
        this.email.set(negocio.email ?? '');
        this.telefono.set(negocio.telefono ?? '');
        this.direccion.set(negocio.direccion ?? '');
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los datos del negocio');
      },
    });
  }

  protected guardar(): void {
    if (!this.nombre().trim()) {
      this.toast.error('El nombre del negocio es obligatorio');
      return;
    }
    this.guardando.set(true);
    this.negociosService
      .actualizarMiNegocio({
        nombre: this.nombre().trim(),
        nit: this.nit().trim() || undefined,
        tipoNegocio: this.tipoNegocio().trim() || undefined,
        email: this.email().trim() || undefined,
        telefono: this.telefono().trim() || undefined,
        direccion: this.direccion().trim() || undefined,
      })
      .subscribe({
        next: (negocio) => {
          this.negocio.set(negocio);
          this.guardando.set(false);
          this.toast.success('Datos del negocio actualizados');
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudieron guardar los cambios');
        },
      });
  }

  /** El backend guarda rutas relativas (`/uploads/...`) — mismo prefijo que usa el ticket impreso. */
  protected logoUrlCompleta(): string | null {
    const logoUrl = this.negocio()?.logoUrl;
    return logoUrl ? `${environment.assetsUrl}${logoUrl}` : null;
  }

  /** `ds-image-upload` emite el archivo elegido, o `null` al tocar la "x" de quitar. */
  protected alElegirLogo(archivo: File | null): void {
    if (archivo) this.subirLogo(archivo);
    else void this.quitarLogo();
  }

  private subirLogo(archivo: File): void {
    if (archivo.size > MAX_LOGO_BYTES) {
      this.toast.error('El logo pesa más de 2 MB — elegí una imagen más liviana');
      this.versionLogo.update((v) => v + 1);
      return;
    }
    this.subiendoLogo.set(true);
    this.negociosService.subirLogo(archivo).subscribe({
      next: ({ logoUrl }) => {
        this.subiendoLogo.set(false);
        this.negocio.update((n) => (n ? { ...n, logoUrl } : n));
        this.toast.success('Logo actualizado — ya aparece en tus recibos y facturas');
      },
      error: (err) => {
        this.subiendoLogo.set(false);
        this.versionLogo.update((v) => v + 1);
        this.toast.error(err.error?.message ?? 'No se pudo subir el logo');
      },
    });
  }

  private async quitarLogo(): Promise<void> {
    if (!this.negocio()?.logoUrl) return;
    const ok = await this.confirmService.ask({
      message: '¿Quitar el logo del negocio? Tus recibos y facturas saldrán sin logo (o con el de la tienda online, si hay).',
      danger: true,
    });
    if (!ok) return;
    this.negociosService.quitarLogo().subscribe({
      next: () => {
        this.negocio.update((n) => (n ? { ...n, logoUrl: null } : n));
        this.toast.success('Logo quitado');
      },
      error: () => this.toast.error('No se pudo quitar el logo'),
    });
  }
}
