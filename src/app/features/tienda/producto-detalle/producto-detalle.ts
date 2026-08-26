import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogoPublicoService } from '../../../core/services/catalogo-publico.service';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';
import { ProductoCatalogo } from '../../../core/models/catalogo-publico.model';

@Component({
  selector: 'app-tienda-producto-detalle',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaProductoDetalle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogoService = inject(CatalogoPublicoService);
  protected readonly carrito = inject(CarritoTiendaService);

  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  private readonly productoId = this.route.snapshot.paramMap.get('productoId')!;

  protected readonly cargando = signal(true);
  private readonly todosLosProductos = signal<ProductoCatalogo[]>([]);
  protected readonly producto = computed(() =>
    this.todosLosProductos().find((p) => p.id === this.productoId) ?? null,
  );

  ngOnInit(): void {
    this.carrito.cargarNegocio(this.negocioId);
    this.catalogoService.obtenerCatalogo(this.negocioId).subscribe({
      next: (catalogo) => {
        this.todosLosProductos.set(catalogo.productos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
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
