import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../atoms/icon/icon';
import { PoliticaFacturacionService } from '../../../../core/services/politica-facturacion.service';

/** Aviso global para un negocio obligado sin facturación electrónica: días de gracia o bloqueo. */
@Component({
  selector: 'app-banner-facturacion-obligatoria',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './banner-facturacion-obligatoria.html',
  styleUrl: './banner-facturacion-obligatoria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerFacturacionObligatoria {
  private readonly politica = inject(PoliticaFacturacionService);
  protected readonly estado = this.politica.estado;
  protected readonly modo = computed(() => this.estado()?.modo);
}
