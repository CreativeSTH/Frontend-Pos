import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-form-field',
  standalone: true,
  template: `
    @if (label()) {
      <label class="ds-field__label">{{ label() }}</label>
    }
    <ng-content />
    @if (error()) {
      <span class="ds-field__error">{{ error() }}</span>
    } @else if (hint()) {
      <span class="ds-field__hint">{{ hint() }}</span>
    }
  `,
  styleUrl: './form-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
  readonly label = input<string | undefined>(undefined);
  readonly error = input<string | null | undefined>(undefined);
  readonly hint = input<string | undefined>(undefined);
}
