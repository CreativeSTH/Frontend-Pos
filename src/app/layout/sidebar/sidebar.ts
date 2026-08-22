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

interface NavItem {
  label: string;
  icon: string;
  route?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Punto de venta', icon: 'shopping-bag', route: '/punto-venta' },
  { label: 'Productos', icon: 'box', route: '/productos' },
  { label: 'Categorías', icon: 'layers', route: '/categorias' },
  { label: 'Marcas', icon: 'tag', route: '/marcas' },
  { label: 'Inventario', icon: 'archive', route: '/inventario' },
  { label: 'Bodegas', icon: 'layers', route: '/bodegas' },
  { label: 'Caja', icon: 'cash-register', route: '/caja' },
  { label: 'Ventas', icon: 'receipt', route: '/ventas' },
  { label: 'Clientes', icon: 'users', route: '/clientes' },
  { label: 'Cobros', icon: 'wallet', route: '/cobros' },
  { label: 'Reportes', icon: 'bar-chart', route: '/reportes' },
  { label: 'Sucursales', icon: 'store', route: '/sucursales' },
  { label: 'Usuarios', icon: 'users', route: '/usuarios' },
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
  protected readonly navItems = NAV_ITEMS;

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
