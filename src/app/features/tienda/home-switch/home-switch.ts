import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TiendaContextService } from '../../../core/services/tienda-context.service';
import { AuroraHome } from '../plantillas/aurora/aurora-home';

@Component({
  selector: 'app-tienda-home-switch',
  standalone: true,
  imports: [AuroraHome],
  templateUrl: './home-switch.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaHomeSwitch {
  protected readonly tienda = inject(TiendaContextService);
}
