import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Button } from '../../../shared/ui/atoms/button/button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PoliticaFacturacionService } from '../../../core/services/politica-facturacion.service';
import { ResponsabilidadIva, TipoPersona } from '../../../core/models/politica-facturacion.model';

/**
 * Declaración obligatoria del perfil fiscal: sin él, AURA no sabe si el negocio está obligado a
 * facturar electrónicamente. No se puede cerrar (se ignora el `close` del modal) y solo lo ve quien
 * puede editar los datos del negocio — los cajeros siguen vendiendo sin verlo.
 */
@Component({
  selector: 'app-modal-perfil-fiscal',
  standalone: true,
  imports: [Modal, Select, Switch, Button, FormField, FormsModule],
  templateUrl: './modal-perfil-fiscal.html',
  styleUrl: './modal-perfil-fiscal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalPerfilFiscal {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly politica = inject(PoliticaFacturacionService);

  protected readonly tipoPersona = signal<TipoPersona | ''>('');
  protected readonly responsabilidadIva = signal<ResponsabilidadIva | ''>('');
  protected readonly acepta = signal(false);
  protected readonly guardando = signal(false);

  protected readonly visible = computed(() => {
    const estado = this.politica.estado();
    return !!estado && estado.perfil === null && !this.auth.esSistema() && this.auth.tienePermiso('NEGOCIO', 'EDITAR');
  });

  protected readonly completo = computed(() => !!this.tipoPersona() && !!this.responsabilidadIva() && this.acepta());

  protected guardar(): void {
    const tipoPersona = this.tipoPersona();
    const responsabilidadIva = this.responsabilidadIva();
    if (!tipoPersona || !responsabilidadIva || !this.acepta()) return;
    this.guardando.set(true);
    this.politica.declararPerfil({ tipoPersona, responsabilidadIva, aceptaDeclaracion: true }).subscribe({
      next: (estado) => {
        this.guardando.set(false);
        this.toast.success(
          estado.obligado
            ? 'Perfil guardado. Tu negocio debe facturar electrónicamente.'
            : 'Perfil fiscal guardado.',
        );
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
