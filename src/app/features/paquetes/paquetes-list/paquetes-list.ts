import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { PaquetesService } from '../../../core/services/paquetes.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Paquete } from '../../../core/models/paquete.model';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

@Component({
  selector: 'app-paquetes-list',
  standalone: true,
  imports: [
    Topbar, Button, Badge, Icon, Table, Modal, FormField, Input, Switch, EmptyState, Paginator,
    ReactiveFormsModule,
  ],
  templateUrl: './paquetes-list.html',
  styleUrl: './paquetes-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaquetesList {
  private readonly paquetesService = inject(PaquetesService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly paquetes = signal<Paquete[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.paquetes().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly paquetesPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.paquetes().slice(inicio, inicio + this.pageSize);
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precioMensual: [0, [Validators.required, Validators.min(0)]],
    facturacionDianHabilitada: [false],
    documentosDianPorMes: [0, [Validators.min(0)]],
    tiendaOnlineHabilitada: [false],
    maxSucursales: [0, [Validators.min(0)]],
    maxUsuarios: [0, [Validators.min(0)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.paquetesService.findAll().subscribe({
      next: (data) => {
        this.paquetes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los paquetes');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      nombre: '', descripcion: '', precioMensual: 0,
      facturacionDianHabilitada: false, documentosDianPorMes: 0,
      tiendaOnlineHabilitada: false, maxSucursales: 0, maxUsuarios: 0,
    });
    this.showForm.set(true);
  }

  protected openEdit(paquete: Paquete): void {
    this.editingId.set(paquete.id);
    this.form.reset({
      nombre: paquete.nombre,
      descripcion: paquete.descripcion ?? '',
      precioMensual: paquete.precioMensual,
      facturacionDianHabilitada: paquete.facturacionDianHabilitada,
      documentosDianPorMes: paquete.documentosDianPorMes,
      tiendaOnlineHabilitada: paquete.tiendaOnlineHabilitada,
      maxSucursales: paquete.maxSucursales,
      maxUsuarios: paquete.maxUsuarios,
    });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = this.form.getRawValue();
    const editingId = this.editingId();
    const request$ = editingId
      ? this.paquetesService.update(editingId, payload)
      : this.paquetesService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Paquete actualizado' : 'Paquete creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el paquete');
      },
    });
  }

  protected async eliminar(paquete: Paquete): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Desactivar "${paquete.nombre}"?`, danger: true }))) return;
    this.paquetesService.remove(paquete.id).subscribe({
      next: () => {
        this.toast.success('Paquete desactivado');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo desactivar el paquete'),
    });
  }

  protected formatMoney = formatMoney;
}
