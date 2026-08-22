import { ChangeDetectionStrategy, Component, ElementRef, input, model, output, viewChild } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-search-bar',
  standalone: true,
  imports: [Icon],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  readonly placeholder = input<string>('Buscar o escanear código de barras...');
  readonly value = model<string>('');
  readonly submit = output<string>();

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  protected handleInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.value().trim()) {
      this.submit.emit(this.value().trim());
    }
  }

  protected clear(): void {
    this.value.set('');
    this.inputRef()?.nativeElement.focus();
  }

  focus(): void {
    this.inputRef()?.nativeElement.focus();
  }
}
