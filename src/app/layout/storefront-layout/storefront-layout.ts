import { ChangeDetectionStrategy, Component, HostBinding, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { TiendaContextService } from '../../core/services/tienda-context.service';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './storefront-layout.html',
  styleUrl: './storefront-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly tienda = inject(TiendaContextService);

  @HostBinding('attr.data-plantilla') get plantillaAttr(): string {
    return this.tienda.plantilla();
  }

  ngOnInit(): void {
    const negocioId = this.route.snapshot.paramMap.get('negocioId')!;
    this.tienda.cargar(negocioId);
  }
}
