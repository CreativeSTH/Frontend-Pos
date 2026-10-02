import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WompiTokenizacionService } from '../../../core/services/wompi-tokenizacion.service';
import { Button } from '../../../shared/ui/atoms/button/button';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';

type Campo = 'numero' | 'cvc' | 'mesVencimiento' | 'anioVencimiento' | 'nombreTitular';

/** Mensaje de cada campo cuando es inválido — antes un campo mal escrito dejaba el botón "sin hacer nada". */
const MENSAJES: Record<Campo, string> = {
  numero: 'Escribe el número completo de la tarjeta',
  cvc: 'El CVC tiene 3 o 4 dígitos',
  mesVencimiento: 'Mes del 1 al 12',
  anioVencimiento: 'Año con 2 dígitos (29) o 4 (2029)',
  nombreTitular: 'Escribe el nombre como aparece en la tarjeta',
};

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
  /** Se marca al intentar enviar: desde ahí cada campo inválido muestra su mensaje. */
  protected readonly intentoEnviar = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    numero: ['', [Validators.required, Validators.pattern(/^[\d\s-]{13,23}$/)]],
    cvc: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    // Se aceptan "9" y "09": antes "9" dejaba el formulario inválido sin ningún aviso.
    mesVencimiento: ['', [Validators.required, Validators.pattern(/^(0?[1-9]|1[0-2])$/)]],
    // Se aceptan "29" y "2029"; Wompi recibe siempre 2 dígitos (ver tokenizar).
    anioVencimiento: ['', [Validators.required, Validators.pattern(/^(\d{2}|20\d{2})$/)]],
    nombreTitular: ['', Validators.required],
  });

  protected errorDe(campo: Campo): string | null {
    const control = this.form.controls[campo];
    return this.intentoEnviar() && control.invalid ? MENSAJES[campo] : null;
  }

  protected async tokenizar(): Promise<void> {
    this.intentoEnviar.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los datos marcados.');
      return;
    }
    this.tokenizando.set(true);
    this.error.set(null);
    const datos = this.form.getRawValue();
    try {
      const resultado = await this.tokenizacion.tokenizar({
        ...datos,
        numero: datos.numero.replace(/[\s-]/g, ''),
        cvc: datos.cvc.trim(),
        mesVencimiento: datos.mesVencimiento.trim().padStart(2, '0'),
        anioVencimiento: datos.anioVencimiento.trim().slice(-2),
        nombreTitular: datos.nombreTitular.trim(),
      });
      this.tokenizada.emit(resultado);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo validar la tarjeta');
    } finally {
      this.tokenizando.set(false);
    }
  }
}
