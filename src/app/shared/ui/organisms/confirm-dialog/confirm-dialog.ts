import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button } from '../../atoms/button/button';
import { ConfirmService } from '../../../../core/services/confirm.service';

/** Montado una vez en el layout — reemplaza `confirm()` nativo en toda la app. Ver `ConfirmService`. */
@Component({
  selector: 'ds-confirm-dialog',
  standalone: true,
  imports: [Modal, Button],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly confirmService = inject(ConfirmService);
}
