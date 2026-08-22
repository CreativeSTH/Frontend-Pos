import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Usuario } from '../../../core/models/usuario.model';
import { RolUsuario } from '../../../core/models/auth.model';
import { Sucursal } from '../../../core/models/sucursal.model';

const ROLES_DISPONIBLES: { value: RolUsuario; label: string }[] = [
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'ADMIN_NEGOCIO', label: 'Administrador' },
];

@Component({
  selector: 'app-usuarios-list',
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
    Select,
    EmptyState,
    ReactiveFormsModule,
  ],
  templateUrl: './usuarios-list.html',
  styleUrl: './usuarios-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosList {
  private readonly usuariosService = inject(UsuariosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly roles = ROLES_DISPONIBLES;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    pin: ['', Validators.pattern(/^\d{4,6}$/)],
    rol: ['CAJERO' as RolUsuario, Validators.required],
    sucursalId: [''],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.usuariosService.findAll().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los usuarios');
      },
    });
    this.sucursalesService.findAll().subscribe((data) => this.sucursales.set(data));
  }

  protected nombreSucursal(id: string | null): string {
    if (!id) return 'Todas';
    return this.sucursales().find((s) => s.id === id)?.nombre ?? '—';
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', email: '', password: '', pin: '', rol: 'CAJERO', sucursalId: '' });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.showForm.set(true);
  }

  protected openEdit(usuario: Usuario): void {
    this.editingId.set(usuario.id);
    this.form.reset({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      pin: '',
      rol: usuario.rol,
      sucursalId: usuario.sucursalId ?? '',
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
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
      ? this.usuariosService.update(editingId, {
          nombre: raw.nombre,
          email: raw.email,
          pin: raw.pin || undefined,
          rol: raw.rol,
          sucursalId: raw.sucursalId || undefined,
        })
      : this.usuariosService.create({
          nombre: raw.nombre,
          email: raw.email,
          password: raw.password,
          pin: raw.pin || undefined,
          rol: raw.rol,
          sucursalId: raw.sucursalId || undefined,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Usuario actualizado' : 'Usuario creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el usuario');
      },
    });
  }

  protected eliminar(usuario: Usuario): void {
    if (!confirm(`¿Desactivar a "${usuario.nombre}"?`)) return;
    this.usuariosService.remove(usuario.id).subscribe({
      next: () => {
        this.toast.success('Usuario desactivado');
        this.load();
      },
      error: () => this.toast.error('No se pudo desactivar el usuario'),
    });
  }
}
