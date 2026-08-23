import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Sucursal } from '../../../core/models/sucursal.model';

@Component({
  selector: 'app-sucursales-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, EmptyState, Paginator, ReactiveFormsModule],
  templateUrl: './sucursales-list.html',
  styleUrl: './sucursales-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SucursalesList {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    metaVentasDiaria: [0],
  });

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.sucursales().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly sucursalesPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.sucursales().slice(inicio, inicio + this.pageSize);
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
    this.form.reset({ nombre: '', direccion: '', telefono: '', metaVentasDiaria: 0 });
    this.showForm.set(true);
  }

  protected openEdit(sucursal: Sucursal): void {
    this.editingId.set(sucursal.id);
    this.form.reset({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion ?? '',
      telefono: sucursal.telefono ?? '',
      metaVentasDiaria: sucursal.metaVentasDiaria ?? 0,
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
      metaVentasDiaria: raw.metaVentasDiaria || undefined,
    };

    const editingId = this.editingId();
    const request$ = editingId
      ? this.sucursalesService.update(editingId, payload)
      : this.sucursalesService.create(payload);

    request$.subscribe({
      next: async (sucursal) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Sucursal actualizada' : 'Sucursal creada');
        this.load();
        if (!editingId) {
          await this.ofrecerConfigurarAhora(sucursal.id);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la sucursal');
      },
    });
  }

  /** Solo tras crear (no editar) una sucursal nueva — ofrece continuar directo con el asistente. */
  private async ofrecerConfigurarAhora(sucursalId: string): Promise<void> {
    const configurarAhora = await this.confirmService.ask({
      title: 'Sucursal creada',
      message: '¿Querés dejarla lista ahora con su bodega y stock?',
      confirmLabel: 'Sí, configurar',
      cancelLabel: 'Más tarde',
    });
    if (configurarAhora) {
      this.router.navigate(['/asistente'], { queryParams: { sucursalId } });
    }
  }

  protected async eliminar(sucursal: Sucursal): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${sucursal.nombre}"?`, danger: true }))) return;
    this.sucursalesService.remove(sucursal.id).subscribe({
      next: () => {
        this.toast.success('Sucursal eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar la sucursal'),
    });
  }
}
