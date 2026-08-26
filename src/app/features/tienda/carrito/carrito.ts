import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarritoTiendaService } from '../../../core/services/carrito-tienda.service';

@Component({
  selector: 'app-tienda-carrito',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaCarrito implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly carrito = inject(CarritoTiendaService);
  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;

  ngOnInit(): void {
    this.carrito.cargarNegocio(this.negocioId);
  }
}
