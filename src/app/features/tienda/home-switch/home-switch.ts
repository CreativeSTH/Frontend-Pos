import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TiendaContextService } from '../../../core/services/tienda-context.service';
import { AuroraHome } from '../plantillas/aurora/aurora-home';
import { AtelierHome } from '../plantillas/atelier/atelier-home';
import { FoundryHome } from '../plantillas/foundry/foundry-home';
import { NocturneHome } from '../plantillas/nocturne/nocturne-home';

@Component({
  selector: 'app-tienda-home-switch',
  standalone: true,
  imports: [AuroraHome, AtelierHome, FoundryHome, NocturneHome],
  templateUrl: './home-switch.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaHomeSwitch {
  protected readonly tienda = inject(TiendaContextService);
}
