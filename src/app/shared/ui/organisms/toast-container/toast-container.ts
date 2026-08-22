import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../../core/services/toast.service';
import { Toast } from '../../molecules/toast/toast';

@Component({
  selector: 'ds-toast-container',
  standalone: true,
  imports: [Toast],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <ds-toast [tone]="toast.tone" [text]="toast.text" (closed)="toastService.dismiss(toast.id)" />
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: var(--space-5);
        right: var(--space-5);
        z-index: var(--z-toast);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
}
