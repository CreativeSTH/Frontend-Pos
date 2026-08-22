import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
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
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, Select, EmptyState, ReactiveFormsModule],
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

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    sucursalId: ['', Validators.required],
  });

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
    this.sucursalesService.findAll().subscribe((data) => {
      this.sucursales.set(data);
      if (data.length > 0) {
        this.form.patchValue({ sucursalId: data[0].id });
      }
    });
  }

  protected nombreSucursal(id: string): string {
    return this.sucursales().find((s) => s.id === id)?.nombre ?? '—';
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', sucursalId: this.sucursales()[0]?.id ?? '' });
    this.showForm.set(true);
  }

  protected openEdit(bodega: Bodega): void {
    this.editingId.set(bodega.id);
    this.form.reset({ nombre: bodega.nombre, sucursalId: bodega.sucursalId });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const editingId = this.editingId();
    const request$ = editingId
      ? this.bodegasService.update(editingId, raw)
      : this.bodegasService.create(raw);

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
      error: () => this.toast.error('No se pudo eliminar la bodega'),
    });
  }
}
