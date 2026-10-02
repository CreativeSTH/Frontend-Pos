import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-modal',
  standalone: true,
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly title = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** false: sin X y sin cerrar con Escape ni clic afuera (p. ej. mientras se confirma un pago). */
  readonly cerrable = input(true);
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.cerrable()) this.close.emit();
  }

  protected onBackdropClick(): void {
    if (this.cerrable()) this.close.emit();
  }
}
