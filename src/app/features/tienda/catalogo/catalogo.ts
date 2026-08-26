import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogoPublicoService } from '../../../core/services/catalogo-publico.service';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';
import { ProductoCatalogo } from '../../../core/models/catalogo-publico.model';

@Component({
  selector: 'app-tienda-catalogo',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaCatalogo implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogoService = inject(CatalogoPublicoService);
  protected readonly carrito = inject(CarritoTiendaService);

  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  protected readonly cargando = signal(true);
  protected readonly activa = signal(true);
  protected readonly productos = signal<ProductoCatalogo[]>([]);

  ngOnInit(): void {
    this.carrito.cargarNegocio(this.negocioId);
    this.catalogoService.obtenerCatalogo(this.negocioId).subscribe({
      next: (catalogo) => {
        this.activa.set(catalogo.activa);
        this.productos.set(catalogo.productos);
        this.cargando.set(false);
      },
      error: () => {
        this.activa.set(false);
        this.cargando.set(false);
      },
    });
  }

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
