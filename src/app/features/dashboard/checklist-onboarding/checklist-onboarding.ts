import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Button } from '../../../shared/ui/atoms/button/button';

@Component({
  selector: 'app-checklist-onboarding',
  standalone: true,
  imports: [Icon, Button],
  templateUrl: './checklist-onboarding.html',
  styleUrl: './checklist-onboarding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistOnboarding {
  private readonly onboardingService = inject(OnboardingService);
  private readonly router = inject(Router);

  protected readonly sucursalConfigurada = signal(false);
  protected readonly facturacionDian = signal<'NO_APLICA' | 'PENDIENTE' | 'LISTO'>('NO_APLICA');
  protected readonly primeraVentaRealizada = signal(false);
  protected readonly cargado = signal(false);

  protected readonly completo = computed(
    () =>
      this.sucursalConfigurada() &&
      this.primeraVentaRealizada() &&
      (this.facturacionDian() === 'LISTO' || this.facturacionDian() === 'NO_APLICA'),
  );

  constructor() {
    this.onboardingService.estado().subscribe({
      next: (data) => {
        this.sucursalConfigurada.set(data.sucursalConfigurada);
        this.facturacionDian.set(data.facturacionDian);
        this.primeraVentaRealizada.set(data.primeraVentaRealizada);
        this.cargado.set(true);
      },
      error: () => this.cargado.set(true),
    });
  }

  protected irASucursales(): void {
    this.router.navigateByUrl('/asistente');
  }

  protected irAFacturacionDian(): void {
    this.router.navigateByUrl('/configuracion/facturacion-electronica');
  }

  protected irAlPos(): void {
    this.router.navigateByUrl('/punto-venta');
  }
}
