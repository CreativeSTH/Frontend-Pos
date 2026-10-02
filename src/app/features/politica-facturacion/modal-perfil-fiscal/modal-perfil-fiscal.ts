import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { AuthService } from '../../../core/services/auth.service';
import { PoliticaFacturacionService } from '../../../core/services/politica-facturacion.service';
import { PerfilFiscalForm } from '../perfil-fiscal-form/perfil-fiscal-form';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';

/**
 * Declaración obligatoria del perfil fiscal: sin él, AURA no sabe si el negocio está obligado a
 * facturar electrónicamente. No se puede cerrar (se ignora el `close` del modal) y solo lo ve quien
 * puede editar los datos del negocio — los cajeros siguen vendiendo sin verlo. Con la suscripción
 * vencida no aparece: primero hay que reactivarla (banner de solo lectura), y después vuelve solo.
 * Al guardar, el estado de la política ya trae el perfil y el modal se oculta.
 */
@Component({
  selector: 'app-modal-perfil-fiscal',
  standalone: true,
  imports: [EnlaceAyuda, Modal, PerfilFiscalForm],
  templateUrl: './modal-perfil-fiscal.html',
  styleUrl: './modal-perfil-fiscal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalPerfilFiscal {
  private readonly auth = inject(AuthService);
  private readonly politica = inject(PoliticaFacturacionService);

  protected readonly visible = computed(() => {
    const estado = this.politica.estado();
    return (
      !!estado &&
      estado.perfil === null &&
      !this.politica.suscripcionInactiva() &&
      !this.auth.esSistema() &&
      this.auth.tienePermiso('NEGOCIO', 'EDITAR')
    );
  });
}
