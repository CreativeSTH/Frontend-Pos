import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { AuthService } from '../../../core/services/auth.service';

/** Todo lo de facturación en un lugar (spec 6.3): una pestaña por ruta hija, visible según permisos. */
@Component({
  selector: 'app-facturacion-page',
  standalone: true,
  imports: [Topbar, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './facturacion-page.html',
  styleUrl: './facturacion-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionPage {
  private readonly auth = inject(AuthService);

  protected readonly pestanas = computed(() =>
    [
      { ruta: 'comprobantes', etiqueta: 'Comprobantes', visible: this.auth.tienePermiso('FACTURACION', 'VER') },
      {
        ruta: 'electronica',
        etiqueta: 'Facturación electrónica',
        visible: this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'VER'),
      },
      {
        ruta: 'contingencia',
        etiqueta: 'Contingencia',
        visible: this.auth.tienePermiso('FACTURACION_ELECTRONICA_DIAN', 'VER'),
      },
      { ruta: 'formato', etiqueta: 'Formato de impresión', visible: this.auth.tienePermiso('FACTURACION', 'EDITAR') },
    ].filter((p) => p.visible),
  );
}
