import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { NegociosService } from '../../../core/services/negocios.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Negocio } from '../../../core/models/negocio.model';

@Component({
  selector: 'app-negocios-list',
  standalone: true,
  imports: [Topbar, Button, Badge, Icon, Table, Modal, FormField, Input, EmptyState, Paginator, ReactiveFormsModule],
  templateUrl: './negocios-list.html',
  styleUrl: './negocios-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NegociosList {
  private readonly negociosService = inject(NegociosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly negocios = signal<Negocio[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly entrando = signal<string | null>(null);

  protected readonly pag = usePaginacion(this.negocios);
  protected readonly negociosPaginados = this.pag.itemsPaginados;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    nit: [''],
    tipoNegocio: [''],
    email: ['', Validators.email],
    telefono: [''],
    direccion: [''],
    adminNombre: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.negociosService.findAll().subscribe({
      next: (data) => {
        this.negocios.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los negocios');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      nombre: '',
      nit: '',
      tipoNegocio: '',
      email: '',
      telefono: '',
      direccion: '',
      adminNombre: '',
      adminEmail: '',
      adminPassword: '',
    });
    this.form.controls.adminNombre.enable();
    this.form.controls.adminEmail.enable();
    this.form.controls.adminPassword.enable();
    this.showForm.set(true);
  }

  protected openEdit(negocio: Negocio): void {
    this.editingId.set(negocio.id);
    this.form.reset({
      nombre: negocio.nombre,
      nit: negocio.nit ?? '',
      tipoNegocio: negocio.tipoNegocio ?? '',
      email: negocio.email ?? '',
      telefono: negocio.telefono ?? '',
      direccion: negocio.direccion ?? '',
      adminNombre: '',
      adminEmail: '',
      adminPassword: '',
    });
    // El admin inicial solo se crea junto con el negocio — al editar, esos campos no aplican.
    this.form.controls.adminNombre.disable();
    this.form.controls.adminEmail.disable();
    this.form.controls.adminPassword.disable();
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

    const datosNegocio = {
      nombre: raw.nombre,
      nit: raw.nit || undefined,
      tipoNegocio: raw.tipoNegocio || undefined,
      email: raw.email || undefined,
      telefono: raw.telefono || undefined,
      direccion: raw.direccion || undefined,
    };

    const request$ = editingId
      ? this.negociosService.update(editingId, datosNegocio)
      : this.negociosService.create({
          ...datosNegocio,
          adminInicial: { nombre: raw.adminNombre, email: raw.adminEmail, password: raw.adminPassword },
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Negocio actualizado' : 'Negocio creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el negocio');
      },
    });
  }

  protected async eliminar(negocio: Negocio): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Desactivar "${negocio.nombre}"?`, danger: true }))) return;
    this.negociosService.remove(negocio.id).subscribe({
      next: () => {
        this.toast.success('Negocio desactivado');
        this.load();
      },
      error: () => this.toast.error('No se pudo desactivar el negocio'),
    });
  }

  protected entrar(negocio: Negocio): void {
    this.entrando.set(negocio.id);
    this.auth.entrarComoNegocio(negocio.id).subscribe({
      next: () => {
        this.entrando.set(null);
        this.toast.success(`Ahora estás dentro de "${negocio.nombre}"`);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.entrando.set(null);
        this.toast.error(err.error?.message ?? 'No se pudo entrar a este negocio');
      },
    });
  }
}
