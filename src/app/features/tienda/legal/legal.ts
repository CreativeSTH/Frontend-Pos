import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TiendaContextService } from '../../../core/services/tienda-context.service';

type CampoLegal = 'terminos' | 'tratamientoDatos' | 'politicaEnvios';

const TITULOS: Record<CampoLegal, string> = {
  terminos: 'Términos y condiciones',
  tratamientoDatos: 'Tratamiento de datos personales',
  politicaEnvios: 'Política de envíos',
};

@Component({
  selector: 'app-tienda-legal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaLegal {
  private readonly route = inject(ActivatedRoute);
  protected readonly tienda = inject(TiendaContextService);

  private readonly campo = this.route.snapshot.data['campo'] as CampoLegal;
  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  protected readonly titulo = TITULOS[this.campo];

  protected readonly contenido = computed(() => {
    switch (this.campo) {
      case 'terminos': return this.tienda.terminos();
      case 'tratamientoDatos': return this.tienda.tratamientoDatos();
      case 'politicaEnvios': return this.tienda.politicaEnvios();
    }
  });
}
