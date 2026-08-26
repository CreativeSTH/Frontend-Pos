import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';
import { TiendaContextService } from '../../../core/services/tienda-context.service';
import { TiendaHomeSwitch } from '../home-switch/home-switch';

@Component({
  selector: 'app-tienda-catalogo',
  standalone: true,
  imports: [TiendaHomeSwitch],
  template: '<app-tienda-home-switch />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaCatalogo {
  private readonly route = inject(ActivatedRoute);
  protected readonly tienda = inject(TiendaContextService);
  private readonly carrito = inject(CarritoTiendaService);

  constructor() {
    const negocioId = this.route.snapshot.paramMap.get('negocioId')!;
    this.carrito.cargarNegocio(negocioId);
  }
}
