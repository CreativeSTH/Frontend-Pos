import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Icon } from '../icon/icon';

/**
 * Select nativo envuelto con el mismo look de ds-input, pero sobre todo con
 * `width: 100%; min-width: 0` — el bug que resolvía: un <select> nativo suelto
 * dentro de una grilla toma el ancho de su opción más larga y se niega a
 * encogerse, desbordando el modal. Content-projecta las <option> tal cual las
 * escribía cada página, así que migrar un <select> existente es solo cambiar
 * la etiqueta.
 */
@Component({
  selector: 'ds-select',
  standalone: true,
  imports: [Icon],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
})
export class Select implements ControlValueAccessor {
  readonly icon = input<string | undefined>(undefined);
  readonly invalid = input<boolean>(false);

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected handleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
