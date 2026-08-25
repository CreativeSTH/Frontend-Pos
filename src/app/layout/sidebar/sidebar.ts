import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Avatar } from '../../shared/ui/atoms/avatar/avatar';
import { Modal } from '../../shared/ui/organisms/modal/modal';
import { Button } from '../../shared/ui/atoms/button/button';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../shared/ui/atoms/input/input';
import { AuthService } from '../../core/services/auth.service';
import { MobileNavService } from '../../core/services/mobile-nav.service';
import { ToastService } from '../../core/services/toast.service';
import { Tema, ThemeService } from '../../core/services/theme.service';
import { ModuloPermiso } from '../../core/models/auth.model';
import { CONFIG_GROUPS } from '../../core/models/configuracion-menu.model';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  modulo?: ModuloPermiso;
  /** Pantallas operativas de un negocio, sin sentido para un usuario de tier SISTEMA (no pertenece a ninguno). */
  soloNegocio?: boolean;
}

/** Módulos empaquetados en `/configuracion` (ver configuracion-menu.model.ts) — el botón de Configuración solo se oculta si ninguno es visible. */
const MODULOS_CONFIGURACION = CONFIG_GROUPS.flatMap((grupo) => grupo.items.map((item) => item.modulo));

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', soloNegocio: true },
  { label: 'Punto de venta', icon: 'shopping-bag', route: '/punto-venta', soloNegocio: true },
  { label: 'Caja', icon: 'cash-register', route: '/caja', modulo: 'CAJA' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Icon, Avatar, Modal, Button, FormField, Input, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  protected readonly auth = inject(AuthService);
  protected readonly mobileNav = inject(MobileNavService);
  protected readonly themeService = inject(ThemeService);
  private readonly toast = inject(ToastService);

  protected readonly temas: { valor: Tema; etiqueta: string }[] = [
    { valor: 'glass', etiqueta: 'Glass' },
    { valor: 'saas-dark', etiqueta: 'SaaS oscuro' },
    { valor: 'saas-light', etiqueta: 'SaaS claro' },
  ];
  /** Solo los ítems cuyo módulo el usuario puede VER (Dashboard no tiene permiso asociado, siempre se muestra) y que no sean exclusivos de un negocio si el usuario es de tier SISTEMA. */
  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter(
      (item) =>
        (!item.modulo || this.auth.tienePermiso(item.modulo, 'VER')) &&
        (!item.soloNegocio || !this.auth.esSistema()),
    ),
  );

  /** El botón de Configuración vive aparte del loop de navItems (queda anclado abajo, sobre la card de usuario). */
  protected readonly configuracionVisible = computed(() =>
    MODULOS_CONFIGURACION.some((m) => this.auth.tienePermiso(m, 'VER')),
  );

  protected readonly showPinModal = signal(false);
  protected readonly pin = signal('');
  protected readonly cambiando = signal(false);

  protected logout(): void {
    this.auth.logout();
  }

  protected abrirCambioCajero(): void {
    this.pin.set('');
    this.showPinModal.set(true);
  }

  protected confirmarPin(): void {
    if (!/^\d{4,6}$/.test(this.pin())) {
      this.toast.error('El PIN debe tener entre 4 y 6 dígitos');
      return;
    }
    this.cambiando.set(true);
    this.auth.pinSwitch(this.pin()).subscribe({
      next: (respuesta) => {
        this.cambiando.set(false);
        this.showPinModal.set(false);
        this.mobileNav.close();
        this.toast.success(`Turno cambiado a ${respuesta.usuario.nombre}`);
      },
      error: (err) => {
        this.cambiando.set(false);
        this.toast.error(err.error?.message ?? 'PIN inválido');
      },
    });
  }
}
