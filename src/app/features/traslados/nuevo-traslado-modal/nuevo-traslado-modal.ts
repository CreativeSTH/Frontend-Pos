import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Combobox, ComboboxOption } from '../../../shared/ui/molecules/combobox/combobox';
import { InventarioItem, InventarioService } from '../../../core/services/inventario.service';
import { TrasladosService } from '../../../core/services/traslados.service';
import { Bodega } from '../../../core/models/bodega.model';
import { Traslado } from '../../../core/models/traslado.model';

interface LineaTraslado {
  productoId: string;
  nombre: string;
  disponible: number;
  cantidad: number;
}

@Component({
  selector: 'app-nuevo-traslado-modal',
  standalone: true,
  imports: [Modal, Button, Icon, Input, Select, FormField, Combobox, FormsModule],
  templateUrl: './nuevo-traslado-modal.html',
  styleUrl: './nuevo-traslado-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevoTrasladoModal {
  private readonly inventarioService = inject(InventarioService);
  private readonly trasladosService = inject(TrasladosService);

  readonly bodegas = input.required<Bodega[]>();
  readonly enviado = output<Traslado>();
  readonly cerrar = output<void>();

  protected readonly origenId = signal('');
  protected readonly destinoId = signal('');
  protected readonly nota = signal('');
  protected readonly stockOrigen = signal<InventarioItem[]>([]);
  protected readonly lineas = signal<LineaTraslado[]>([]);
  protected readonly productoElegido = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly destinos = computed(() => this.bodegas().filter((b) => b.id !== this.origenId()));
  /** Solo productos con stock en el origen y que no estén ya en la lista. */
  protected readonly opcionesProducto = computed<ComboboxOption[]>(() =>
    this.stockOrigen()
      .filter((i) => Number(i.cantidad) > 0 && !this.lineas().some((l) => l.productoId === i.productoId))
      .map((i) => ({
        value: i.productoId,
        label: i.producto?.nombre ?? 'Producto',
        sublabel: `Disponible: ${Number(i.cantidad)}`,
      })),
  );
  protected readonly puedeEnviar = computed(
    () =>
      !!this.origenId() &&
      !!this.destinoId() &&
      this.lineas().length > 0 &&
      this.lineas().every((l) => l.cantidad > 0 && l.cantidad <= l.disponible),
  );

  protected elegirOrigen(id: string): void {
    this.origenId.set(id);
    if (this.destinoId() === id) this.destinoId.set('');
    this.lineas.set([]);
    this.stockOrigen.set([]);
    if (id) this.inventarioService.findAll(id).subscribe((items) => this.stockOrigen.set(items));
  }

  protected agregarProducto(productoId: string): void {
    const item = this.stockOrigen().find((i) => i.productoId === productoId);
    if (!item) return;
    this.lineas.update((l) => [
      ...l,
      { productoId, nombre: item.producto?.nombre ?? 'Producto', disponible: Number(item.cantidad), cantidad: 1 },
    ]);
    // Se limpia en el siguiente tick: el combobox todavía está propagando el valor elegido.
    setTimeout(() => this.productoElegido.set(''));
  }

  protected cambiarCantidad(productoId: string, valor: number | string): void {
    const cantidad = Number(valor);
    this.lineas.update((l) => l.map((x) => (x.productoId === productoId ? { ...x, cantidad } : x)));
  }

  protected quitar(productoId: string): void {
    this.lineas.update((l) => l.filter((x) => x.productoId !== productoId));
  }

  protected enviar(): void {
    if (!this.puedeEnviar()) return;
    this.enviando.set(true);
    this.error.set(null);
    this.trasladosService
      .enviar({
        bodegaOrigenId: this.origenId(),
        bodegaDestinoId: this.destinoId(),
        items: this.lineas().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        nota: this.nota().trim() || undefined,
      })
      .subscribe({
        next: (t) => {
          this.enviando.set(false);
          this.enviado.emit(t);
        },
        error: (err) => {
          this.enviando.set(false);
          this.error.set(err.error?.message ?? 'No se pudo enviar el traslado');
        },
      });
  }
}
