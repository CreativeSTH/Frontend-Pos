import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-sucursales-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, EmptyState, ReactiveFormsModule],
  templateUrl: './sucursales-list.html',
  styleUrl: './sucursales-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SucursalesList {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: [''],
    telefono: [''],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.sucursalesService.findAll().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las sucursales');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', direccion: '', telefono: '' });
    this.showForm.set(true);
  }

  protected openEdit(sucursal: Sucursal): void {
    this.editingId.set(sucursal.id);
    this.form.reset({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion ?? '',
      telefono: sucursal.telefono ?? '',
    });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre,
      direccion: raw.direccion || undefined,
      telefono: raw.telefono || undefined,
    };

    const editingId = this.editingId();
    const request$ = editingId
      ? this.sucursalesService.update(editingId, payload)
      : this.sucursalesService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Sucursal actualizada' : 'Sucursal creada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la sucursal');
      },
    });
  }

  protected eliminar(sucursal: Sucursal): void {
    if (!confirm(`¿Eliminar "${sucursal.nombre}"?`)) return;
    this.sucursalesService.remove(sucursal.id).subscribe({
      next: () => {
        this.toast.success('Sucursal eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar la sucursal'),
    });
  }
}
