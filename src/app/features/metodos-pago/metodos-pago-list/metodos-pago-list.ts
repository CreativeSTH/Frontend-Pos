import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { MetodosPagoService } from '../../../core/services/metodos-pago.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MetodoPago } from '../../../core/models/metodo-pago.model';

@Component({
  selector: 'app-metodos-pago-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, Switch, EmptyState, Paginator, ReactiveFormsModule],
  templateUrl: './metodos-pago-list.html',
  styleUrl: './metodos-pago-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodosPagoList {
  private readonly metodosPagoService = inject(MetodosPagoService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly metodos = signal<MetodoPago[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    esEfectivo: [false],
  });

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.metodos().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly metodosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.metodos().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.metodosPagoService.findAll().subscribe({
      next: (data) => {
        this.metodos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los métodos de pago');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', esEfectivo: false });
    this.showForm.set(true);
  }

  protected openEdit(metodo: MetodoPago): void {
    this.editingId.set(metodo.id);
    this.form.reset({ nombre: metodo.nombre, esEfectivo: metodo.esEfectivo });
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
      ? this.metodosPagoService.update(editingId, payload)
      : this.metodosPagoService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Método de pago actualizado' : 'Método de pago creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el método de pago');
      },
    });
  }

  protected async eliminar(metodo: MetodoPago): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${metodo.nombre}"?`, danger: true }))) return;
    this.metodosPagoService.remove(metodo.id).subscribe({
      next: () => {
        this.toast.success('Método de pago eliminado');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar el método de pago'),
    });
  }
}
