import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WompiTokenizacionService } from '../../../core/services/wompi-tokenizacion.service';
import { Button } from '../../../shared/ui/atoms/button/button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';

@Component({
  selector: 'app-tarjeta-form',
  standalone: true,
  imports: [ReactiveFormsModule, Button, FormField, Input],
  templateUrl: './tarjeta-form.html',
  styleUrl: './tarjeta-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaForm {
  private readonly tokenizacion = inject(WompiTokenizacionService);
  private readonly fb = inject(FormBuilder);

  readonly tokenizada = output<{ token: string; ultimosCuatroDigitos: string }>();

  protected readonly tokenizando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    numero: ['', [Validators.required, Validators.minLength(13)]],
    cvc: ['', [Validators.required, Validators.minLength(3)]],
    mesVencimiento: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    anioVencimiento: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
    nombreTitular: ['', Validators.required],
  });

  protected async tokenizar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.tokenizando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.tokenizacion.tokenizar(this.form.getRawValue());
      this.tokenizada.emit(resultado);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo validar la tarjeta');
    } finally {
      this.tokenizando.set(false);
    }
  }
}
