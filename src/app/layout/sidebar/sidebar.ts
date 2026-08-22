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
import { CajaService } from '../../core/services/caja.service';
import { ToastService } from '../../core/services/toast.service';
import { ModuloPermiso } from '../../core/models/auth.model';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  modulo?: ModuloPermiso;
  /** Pantallas operativas de un negocio, sin sentido para un usuario de tier SISTEMA (no pertenece a ninguno). */
  soloNegocio?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', soloNegocio: true },
  { label: 'Punto de venta', icon: 'shopping-bag', route: '/punto-venta', soloNegocio: true },
  { label: 'Productos', icon: 'box', route: '/productos', modulo: 'PRODUCTOS' },
  { label: 'Categorías', icon: 'layers', route: '/categorias', modulo: 'CATEGORIAS' },
  { label: 'Marcas', icon: 'tag', route: '/marcas', modulo: 'MARCAS' },
  { label: 'Inventario', icon: 'archive', route: '/inventario', modulo: 'INVENTARIO' },
  { label: 'Bodegas', icon: 'layers', route: '/bodegas', modulo: 'BODEGAS' },
  { label: 'Lista de pedidos', icon: 'clipboard', route: '/lista-pedidos', modulo: 'INVENTARIO' },
  { label: 'Caja', icon: 'cash-register', route: '/caja', modulo: 'CAJA' },
  { label: 'Ventas', icon: 'receipt', route: '/ventas', modulo: 'VENTAS' },
  { label: 'Clientes', icon: 'users', route: '/clientes', modulo: 'CLIENTES' },
  { label: 'Cobros', icon: 'wallet', route: '/cobros', modulo: 'COBROS' },
  { label: 'Reportes', icon: 'bar-chart', route: '/reportes', modulo: 'REPORTES' },
  { label: 'Alertas', icon: 'bell', route: '/alertas', modulo: 'ALERTAS' },
  { label: 'Sucursales', icon: 'store', route: '/sucursales', modulo: 'SUCURSALES' },
  { label: 'Usuarios', icon: 'users', route: '/usuarios', modulo: 'USUARIOS' },
  { label: 'Roles', icon: 'tag', route: '/roles', modulo: 'ROLES' },
  { label: 'Negocios', icon: 'store', route: '/negocios', modulo: 'NEGOCIOS' },
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
  private readonly cajaService = inject(CajaService);
  private readonly toast = inject(ToastService);
  /** Solo los ítems cuyo módulo el usuario puede VER (Dashboard no tiene permiso asociado, siempre se muestra) y que no sean exclusivos de un negocio si el usuario es de tier SISTEMA. */
  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter(
      (item) =>
        (!item.modulo || this.auth.tienePermiso(item.modulo, 'VER')) &&
        (!item.soloNegocio || !this.auth.esSistema()),
    ),
  );

  /** Con un turno de caja abierto, el sidebar pasa a modo off-canvas/hamburguesa en cualquier tamaño de pantalla. */
  protected readonly hamburgerMode = computed(() => this.cajaService.turnoAbierto() !== null);

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
