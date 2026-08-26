import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';
import { TiendaContextService } from '../../../core/services/tienda-context.service';

@Component({
  selector: 'app-tienda-catalogo',
  standalone: true,
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaCatalogo {
  private readonly route = inject(ActivatedRoute);
  protected readonly tienda = inject(TiendaContextService);
  protected readonly carrito = inject(CarritoTiendaService);
  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;

  constructor() {
    this.carrito.cargarNegocio(this.negocioId);
  }
}
