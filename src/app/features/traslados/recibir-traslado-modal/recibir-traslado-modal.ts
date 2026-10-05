import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { TrasladosService } from '../../../core/services/traslados.service';
import { Traslado, etiquetaTraslado } from '../../../core/models/traslado.model';

interface LineaRecepcion {
  productoId: string;
  nombre: string;
  enviada: number;
  recibida: number;
}

@Component({
  selector: 'app-recibir-traslado-modal',
  standalone: true,
  imports: [Modal, Button, Input, EnlaceAyuda, FormsModule, DecimalPipe],
  templateUrl: './recibir-traslado-modal.html',
  styleUrl: './recibir-traslado-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecibirTrasladoModal implements OnInit {
  private readonly trasladosService = inject(TrasladosService);

  readonly traslado = input.required<Traslado>();
  readonly recibido = output<Traslado>();
  readonly cerrar = output<void>();

  protected readonly lineas = signal<LineaRecepcion[]>([]);
  /** Con faltantes, el primer clic muestra el resumen y el segundo confirma. */
  protected readonly confirmando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly titulo = computed(() => `Recibir ${etiquetaTraslado(this.traslado().consecutivo)}`);
  protected readonly faltantes = computed(() => this.lineas().filter((l) => l.recibida < l.enviada));
  protected readonly valido = computed(() => this.lineas().every((l) => l.recibida >= 0 && l.recibida <= l.enviada));

  ngOnInit(): void {
    this.lineas.set(
      this.traslado().items.map((i) => ({
        productoId: i.productoId,
        nombre: i.producto?.nombre ?? 'Producto',
        enviada: Number(i.cantidadEnviada),
        recibida: Number(i.cantidadEnviada),
      })),
    );
  }

  protected cambiar(productoId: string, valor: number | string): void {
    const recibida = Number(valor);
    this.lineas.update((l) => l.map((x) => (x.productoId === productoId ? { ...x, recibida } : x)));
    this.confirmando.set(false);
  }

  protected confirmar(): void {
    if (!this.valido()) return;
    if (this.faltantes().length > 0 && !this.confirmando()) {
      this.confirmando.set(true);
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.trasladosService
      .recibir(this.traslado().id, {
        items: this.lineas().map((l) => ({ productoId: l.productoId, cantidadRecibida: l.recibida })),
      })
      .subscribe({
        next: (t) => {
          this.enviando.set(false);
          this.recibido.emit(t);
        },
        error: (err) => {
          this.enviando.set(false);
          this.error.set(err.error?.message ?? 'No se pudo recibir el traslado');
        },
      });
  }
}
