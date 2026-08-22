import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Topbar } from '../../layout/topbar/topbar';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { EmptyState } from '../../shared/ui/molecules/empty-state/empty-state';
import { SucursalesService } from '../../core/services/sucursales.service';
import { SucursalContextService } from '../../core/services/sucursal-context.service';
import { ToastService } from '../../core/services/toast.service';
import { Sucursal } from '../../core/models/sucursal.model';

@Component({
  selector: 'app-sucursal-selector',
  standalone: true,
  imports: [Topbar, Icon, EmptyState],
  templateUrl: './sucursal-selector.html',
  styleUrl: './sucursal-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SucursalSelector {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly sucursales = signal<Sucursal[]>([]);

  constructor() {
    this.sucursalesService.findAll().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las sucursales');
      },
    });
  }

  protected elegir(sucursal: Sucursal): void {
    this.sucursalContext.elegir(sucursal.id);
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
    this.router.navigateByUrl(redirect);
  }
}
