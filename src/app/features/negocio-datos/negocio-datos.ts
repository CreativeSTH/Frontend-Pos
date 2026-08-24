import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../layout/topbar/topbar';
import { Button } from '../../shared/ui/atoms/button/button';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Input } from '../../shared/ui/atoms/input/input';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { NegociosService } from '../../core/services/negocios.service';
import { ToastService } from '../../core/services/toast.service';
import { Negocio } from '../../core/models/negocio.model';

@Component({
  selector: 'app-negocio-datos',
  standalone: true,
  imports: [Topbar, Button, Icon, Input, FormField, FormsModule],
  templateUrl: './negocio-datos.html',
  styleUrl: './negocio-datos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NegocioDatos {
  private readonly negociosService = inject(NegociosService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly negocio = signal<Negocio | null>(null);

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
}
