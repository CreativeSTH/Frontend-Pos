import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ds-input',
  standalone: true,
  imports: [Icon],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Input),
      multi: true,
    },
  ],
})
export class Input implements ControlValueAccessor {
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search'>('text');
  readonly placeholder = input<string>('');
  readonly icon = input<string | undefined>(undefined);
  readonly invalid = input<boolean>(false);
  readonly autocomplete = input<string>('off');

  protected readonly value = signal<string | number>('');
  protected readonly disabled = signal<boolean>(false);
  protected readonly showPassword = signal<boolean>(false);

  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  protected get resolvedType(): string {
    if (this.type() === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type();
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const emitted: string | number = this.type() === 'number' ? target.valueAsNumber : target.value;
    this.value.set(this.type() === 'number' ? target.value : target.value);
    this.onChange(emitted);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  writeValue(value: string | number): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
