import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { LockScreen } from '../lock-screen/lock-screen';
import { ToastContainer } from '../../shared/ui/organisms/toast-container/toast-container';
import { ConfirmDialog } from '../../shared/ui/organisms/confirm-dialog/confirm-dialog';
import { BannerVerificarEmail } from '../../shared/ui/organisms/banner-verificar-email/banner-verificar-email';
import { BannerRiesgoPago } from '../../shared/ui/organisms/banner-riesgo-pago/banner-riesgo-pago';
import { BannerDiasRestantesTrial } from '../../shared/ui/organisms/banner-dias-restantes-trial/banner-dias-restantes-trial';
import { BannerSoloLectura } from '../../shared/ui/organisms/banner-solo-lectura/banner-solo-lectura';
import { BannerFacturacionObligatoria } from '../../shared/ui/organisms/banner-facturacion-obligatoria/banner-facturacion-obligatoria';
import { ModalPerfilFiscal } from '../../features/politica-facturacion/modal-perfil-fiscal/modal-perfil-fiscal';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { CajaService } from '../../core/services/caja.service';
import { AlertasService } from '../../core/services/alertas.service';
import { AuthService } from '../../core/services/auth.service';
import { PoliticaFacturacionService } from '../../core/services/politica-facturacion.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, Sidebar, LockScreen, ToastContainer, ConfirmDialog, BannerVerificarEmail, BannerRiesgoPago, BannerDiasRestantesTrial, BannerSoloLectura, BannerFacturacionObligatoria, ModalPerfilFiscal, Icon],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  // Fuerza la instanciación temprana — cada uno se refresca solo al cambiar de
  // usuario/negocio vía su propio `effect()` (ver CajaService/AlertasService).
  private readonly cajaService = inject(CajaService);
  private readonly alertasService = inject(AlertasService);
  protected readonly auth = inject(AuthService);
  private readonly politicaFacturacion = inject(PoliticaFacturacionService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
    });
    // Se recarga al cambiar de usuario: el layout no se recrea al "Entrar" a un negocio en modo
    // soporte ni al cambiar de cajero por PIN. Un usuario de tier SISTEMA no pertenece a un negocio.
    effect(() => {
      const usuario = this.auth.usuario();
      untracked(() => {
        if (!usuario || usuario.rolTier === 'SISTEMA') this.politicaFacturacion.limpiar();
        else this.politicaFacturacion.cargar();
      });
    });
  }

  /**
   * FAB "Volver a punto de venta": ayuda al cajero a no perderse fuera del
   * POS mientras tiene un turno abierto — visible en cualquier pantalla
   * salvo en el propio punto de venta.
   */
  protected readonly mostrarVolverPos = computed(
    () =>
      !this.auth.esSistema() &&
      this.cajaService.turnoAbierto() !== null &&
      !this.currentUrl().startsWith('/punto-venta'),
  );
}
