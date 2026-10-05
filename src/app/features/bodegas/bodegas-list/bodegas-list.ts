import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { esCedi } from '../../../shared/utils/bodegas.util';
import { BodegasService } from '../../../core/services/bodegas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { InventarioService, InventarioItem } from '../../../core/services/inventario.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Bodega } from '../../../core/models/bodega.model';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-bodegas-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, Table, Modal, FormField, Input, EmptyState, EnlaceAyuda, Paginator, ReactiveFormsModule],
  templateUrl: './bodegas-list.html',
  styleUrl: './bodegas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BodegasList {
  private readonly bodegasService = inject(BodegasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly showInventario = signal(false);
  protected readonly bodegaInventario = signal<Bodega | null>(null);
  protected readonly itemsInventarioBodega = signal<InventarioItem[]>([]);
  protected readonly cargandoInventarioBodega = signal(false);

  /** Sucursales marcadas en el formulario. Ninguna = bodega central (CEDI). */
  protected readonly sucursalesSeleccionadas = signal<ReadonlySet<string>>(new Set());
  /** Mensaje del backend cuando no se puede desactivar (409) — se muestra con el enlace de ayuda. */
  protected readonly bloqueoDesactivar = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  protected readonly pag = usePaginacion(this.bodegas);
  protected readonly bodegasPaginadas = this.pag.itemsPaginados;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bodegasService.findAll().subscribe({
      next: (data) => {
        this.bodegas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las bodegas');
      },
    });
    this.sucursalesService.findAll().subscribe((data) => this.sucursales.set(data));
  }

  protected nombreSucursal(id: string): string {
    return this.sucursales().find((s) => s.id === id)?.nombre ?? '—';
  }

  protected etiquetaSucursales(bodega: Bodega): string {
    if (esCedi(bodega)) return 'Bodega central (CEDI)';
    if (bodega.sucursalIds.length === 1) return this.nombreSucursal(bodega.sucursalIds[0]);
    return `Compartida · ${bodega.sucursalIds.length} sucursales`;
  }

  protected tonoSucursales(bodega: Bodega): BadgeTone {
    if (esCedi(bodega)) return 'info';
    return bodega.sucursalIds.length > 1 ? 'warning' : 'neutral';
  }

  protected alternarSucursal(id: string, marcada: boolean): void {
    this.sucursalesSeleccionadas.update((actual) => {
      const nueva = new Set(actual);
      if (marcada) nueva.add(id);
      else nueva.delete(id);
      return nueva;
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '' });
    const primera = this.sucursales()[0];
    this.sucursalesSeleccionadas.set(new Set(primera ? [primera.id] : []));
    this.showForm.set(true);
  }

  protected openEdit(bodega: Bodega): void {
    this.editingId.set(bodega.id);
    this.form.reset({ nombre: bodega.nombre });
    this.sucursalesSeleccionadas.set(new Set(bodega.sucursalIds));
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = { nombre: this.form.getRawValue().nombre, sucursalIds: [...this.sucursalesSeleccionadas()] };
    const editingId = this.editingId();
    const request$ = editingId
      ? this.bodegasService.update(editingId, payload)
      : this.bodegasService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Bodega actualizada' : 'Bodega creada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la bodega');
      },
    });
  }

  protected verInventario(bodega: Bodega): void {
    this.bodegaInventario.set(bodega);
    this.showInventario.set(true);
    this.cargandoInventarioBodega.set(true);
    this.itemsInventarioBodega.set([]);
    this.inventarioService.findAll(bodega.id).subscribe({
      next: (items) => {
        this.itemsInventarioBodega.set(items);
        this.cargandoInventarioBodega.set(false);
      },
      error: () => {
        this.cargandoInventarioBodega.set(false);
        this.toast.error('No se pudo cargar el inventario de la bodega');
      },
    });
  }

  protected async eliminar(bodega: Bodega): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${bodega.nombre}"?`, danger: true }))) return;
    this.bodegasService.remove(bodega.id).subscribe({
      next: () => {
        this.toast.success('Bodega eliminada');
        this.load();
      },
      error: (err) => {
        if (err.status === 409) {
          this.bloqueoDesactivar.set(err.error?.message ?? 'No se puede desactivar esta bodega');
          return;
        }
        this.toast.error(err.error?.message ?? 'No se pudo eliminar la bodega');
      },
    });
  }
}
