import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/ui/atoms/icon/icon';
import { BannerCarousel } from '../../shared/banner-carousel/banner-carousel';
import { TiendaContextService } from '../../../../core/services/tienda-context.service';
import { CarritoTiendaService } from '../../../../core/services/carrito-tienda.service';
import { ProductoCatalogo } from '../../../../core/models/catalogo-publico.model';

@Component({
  selector: 'app-nocturne-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe, Icon, BannerCarousel],
  templateUrl: './nocturne-home.html',
  styleUrl: './nocturne-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NocturneHome {
  protected readonly tienda = inject(TiendaContextService);
  protected readonly carrito = inject(CarritoTiendaService);

  protected agregarAlCarrito(producto: ProductoCatalogo): void {
    this.carrito.agregar({
      productoId: producto.id,
      nombre: producto.nombre,
      precioUnitario: producto.precioVenta,
      porcentajeImpuesto: producto.porcentajeImpuesto,
      imagenUrl: producto.imagenUrl,
    });
  }
}
