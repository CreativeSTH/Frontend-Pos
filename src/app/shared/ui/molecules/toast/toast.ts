import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';
import { ToastTone } from '../../../../core/services/toast.service';

const ICON_BY_TONE: Record<ToastTone, string> = {
  success: 'check',
  error: 'alert-triangle',
  info: 'layers',
};

@Component({
  selector: 'ds-toast',
  standalone: true,
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  readonly tone = input.required<ToastTone>();
  readonly text = input.required<string>();
  readonly closed = output<void>();

  protected get icon(): string {
    return ICON_BY_TONE[this.tone()];
  }
}
