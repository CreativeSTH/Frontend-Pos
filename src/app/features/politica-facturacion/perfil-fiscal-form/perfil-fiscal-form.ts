import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Button } from '../../../shared/ui/atoms/button/button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { ToastService } from '../../../core/services/toast.service';
import { PoliticaFacturacionService } from '../../../core/services/politica-facturacion.service';
import {
  EstadoFacturacion,
  PerfilFiscal,
  ResponsabilidadIva,
  TipoPersona,
} from '../../../core/models/politica-facturacion.model';

/** Declarar o corregir el perfil fiscal — lo usan el modal obligatorio (fase 1) y la pestaña Facturación electrónica. */
@Component({
  selector: 'app-perfil-fiscal-form',
  standalone: true,
  imports: [Select, Switch, Button, FormField, FormsModule],
  templateUrl: './perfil-fiscal-form.html',
  styleUrl: './perfil-fiscal-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilFiscalForm {
  private readonly toast = inject(ToastService);
  private readonly politica = inject(PoliticaFacturacionService);

  readonly inicial = input<PerfilFiscal | null>(null);
  readonly guardado = output<EstadoFacturacion>();

  protected readonly tipoPersona = linkedSignal<TipoPersona | ''>(() => this.inicial()?.tipoPersona ?? '');
  protected readonly responsabilidadIva = linkedSignal<ResponsabilidadIva | ''>(
    () => this.inicial()?.responsabilidadIva ?? '',
  );
  protected readonly acepta = signal(false);
  protected readonly guardando = signal(false);

  protected readonly completo = computed(() => !!this.tipoPersona() && !!this.responsabilidadIva() && this.acepta());

  protected guardar(): void {
    const tipoPersona = this.tipoPersona();
    const responsabilidadIva = this.responsabilidadIva();
    if (!tipoPersona || !responsabilidadIva || !this.acepta()) return;
    this.guardando.set(true);
    this.politica.declararPerfil({ tipoPersona, responsabilidadIva, aceptaDeclaracion: true }).subscribe({
      next: (estado) => {
        this.guardando.set(false);
        this.acepta.set(false);
        this.toast.success(
          estado.obligado ? 'Perfil guardado. Tu negocio debe facturar electrónicamente.' : 'Perfil fiscal guardado.',
        );
        this.guardado.emit(estado);
      },
      error: (err) => {
        this.guardando.set(false);
        // Los errores de validación (class-validator) llegan como arreglo de mensajes.
        const mensaje = err.error?.message;
        this.toast.error((Array.isArray(mensaje) ? mensaje[0] : mensaje) ?? 'No se pudo guardar el perfil fiscal');
      },
    });
  }
}
