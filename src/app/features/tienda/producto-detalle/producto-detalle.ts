import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';
import { TiendaContextService } from '../../../core/services/tienda-context.service';

@Component({
  selector: 'app-tienda-producto-detalle',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaProductoDetalle {
  private readonly route = inject(ActivatedRoute);
  protected readonly tienda = inject(TiendaContextService);
  protected readonly carrito = inject(CarritoTiendaService);

  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  private readonly productoId = this.route.snapshot.paramMap.get('productoId')!;

  protected readonly cargando = this.tienda.cargando;
  protected readonly producto = computed(() =>
    this.tienda.productos().find((p) => p.id === this.productoId) ?? null,
  );

  constructor() {
    this.carrito.cargarNegocio(this.negocioId);
  }

  protected agregarAlCarrito(): void {
    const producto = this.producto();
    if (!producto) return;
    this.carrito.agregar({
      productoId: producto.id,
      nombre: producto.nombre,
      precioUnitario: producto.precioVenta,
      porcentajeImpuesto: producto.porcentajeImpuesto,
      imagenUrl: producto.imagenUrl,
    });
  }
}
