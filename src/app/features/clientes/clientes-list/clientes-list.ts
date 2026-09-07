import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Avatar } from '../../../shared/ui/atoms/avatar/avatar';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { ClientesService } from '../../../core/services/clientes.service';
import { ToastService } from '../../../core/services/toast.service';
import { Cliente } from '../../../core/models/cliente.model';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Badge,
    Avatar,
    Icon,
    Table,
    Modal,
    FormField,
    Input,
    SearchBar,
    EmptyState,
    Paginator,
    ReactiveFormsModule,
  ],
  templateUrl: './clientes-list.html',
  styleUrl: './clientes-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesList {
  private readonly clientesService = inject(ClientesService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    telefono: ['', Validators.required],
    email: [''],
    direccion: [''],
    documentoIdentidad: [''],
    limiteCredito: [0, [Validators.min(0)]],
  });

  protected readonly filtrados = () => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.clientes();
    return this.clientes().filter(
      (c) => c.nombre.toLowerCase().includes(term) || c.telefono.includes(term),
    );
  };

  protected readonly pag = usePaginacion(this.filtrados);
  protected readonly clientesPaginados = this.pag.itemsPaginados;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.clientesService.findAll().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los clientes');
      },
    });
  }

  protected creditoDisponible(cliente: Cliente): number {
    return Number(cliente.limiteCredito) - Number(cliente.deudaActual);
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', telefono: '', email: '', direccion: '', documentoIdentidad: '', limiteCredito: 0 });
    this.showForm.set(true);
  }

  protected openEdit(cliente: Cliente): void {
    this.editingId.set(cliente.id);
    this.form.reset({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
      documentoIdentidad: cliente.documentoIdentidad ?? '',
      limiteCredito: cliente.limiteCredito,
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
      telefono: raw.telefono,
      email: raw.email || undefined,
      direccion: raw.direccion || undefined,
      documentoIdentidad: raw.documentoIdentidad || undefined,
      limiteCredito: Number(raw.limiteCredito),
    };

    const editingId = this.editingId();
    const request$ = editingId
      ? this.clientesService.update(editingId, payload)
      : this.clientesService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Cliente actualizado' : 'Cliente creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el cliente');
      },
    });
  }

  protected toggleBloqueo(cliente: Cliente): void {
    if (cliente.bloqueadoPorMora) {
      this.clientesService.desbloquear(cliente.id).subscribe({
        next: () => {
          this.toast.success('Cliente desbloqueado');
          this.load();
        },
        error: () => this.toast.error('No se pudo desbloquear el cliente'),
      });
      return;
    }
    const motivo = prompt('Motivo del bloqueo:');
    if (!motivo) return;
    this.clientesService.bloquear(cliente.id, motivo).subscribe({
      next: () => {
        this.toast.success('Cliente bloqueado');
        this.load();
      },
      error: () => this.toast.error('No se pudo bloquear el cliente'),
    });
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
