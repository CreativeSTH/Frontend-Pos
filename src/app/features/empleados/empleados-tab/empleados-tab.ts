import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { HistorialAuditoriaModal } from '../../auditoria/historial-auditoria-modal/historial-auditoria-modal';
import { formatMoney } from '../../pos/punto-venta/pos-shared.util';
import { EmpleadosService } from '../../../core/services/empleados.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Empleado, EmpleadoPayload, TIPOS_DOCUMENTO_EMPLEADO, TipoDocumentoEmpleado } from '../../../core/models/empleado.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Usuario } from '../../../core/models/usuario.model';

const PIN = /^\d{4,6}$/;

@Component({
  selector: 'app-empleados-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    Button,
    Badge,
    Icon,
    Input,
    Select,
    Switch,
    Table,
    Modal,
    FormField,
    EmptyState,
    HistorialAuditoriaModal,
  ],
  templateUrl: './empleados-tab.html',
  styleUrl: './empleados-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadosTab {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly empleados = input.required<Empleado[]>();
  readonly sucursales = input.required<Sucursal[]>();
  readonly cargando = input(false);
  readonly cambio = output<void>();

  protected readonly formatMoney = (v: number | string) => formatMoney(Number(v));
  protected readonly tiposDocumento = TIPOS_DOCUMENTO_EMPLEADO;
  protected readonly puedeCrear = this.auth.tienePermiso('EMPLEADOS', 'CREAR');
  protected readonly puedeEditar = this.auth.tienePermiso('EMPLEADOS', 'EDITAR');
  protected readonly puedeEliminar = this.auth.tienePermiso('EMPLEADOS', 'ELIMINAR');
  protected readonly puedeVerAuditoria = this.auth.tienePermiso('AUDITORIA', 'VER');
  protected readonly puedeVerUsuarios = this.auth.tienePermiso('USUARIOS', 'VER');

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly mostrarForm = signal(false);
  protected readonly editando = signal<Empleado | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cambiandoPin = signal<Empleado | null>(null);
  protected readonly nuevoPin = signal('');
  protected readonly errorPin = signal<string | null>(null);
  protected readonly historial = signal<{ entidadId: string; titulo: string } | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipoDocumento: ['CC' as TipoDocumentoEmpleado, Validators.required],
    numeroDocumento: ['', Validators.required],
    cargo: [''],
    sucursalId: [''],
    usuarioId: [''],
    salarioMensual: [0, [Validators.required, Validators.min(1)]],
    aplicaHorasExtra: [true],
    pin: [''],
  });

  private readonly nombreSucursal = computed(() => new Map(this.sucursales().map((s) => [s.id, s.nombre])));
  /** Usuarios libres para vincular: los ya vinculados a otro empleado no se ofrecen. */
  protected readonly usuariosDisponibles = computed(() => {
    const ocupados = new Set(this.empleados().filter((e) => e.id !== this.editando()?.id).map((e) => e.usuarioId));
    return this.usuarios().filter((u) => u.activo && !ocupados.has(u.id));
  });

  constructor() {
    if (this.puedeVerUsuarios) this.usuariosService.findAll().subscribe((u) => this.usuarios.set(u));
  }

  protected sucursal(id: string | null): string {
    return id ? (this.nombreSucursal().get(id) ?? '—') : '—';
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({
      nombre: '',
      tipoDocumento: 'CC',
      numeroDocumento: '',
      cargo: '',
      sucursalId: '',
      usuarioId: '',
      salarioMensual: 0,
      aplicaHorasExtra: true,
      pin: '',
    });
    this.mostrarForm.set(true);
  }

  protected abrirEditar(e: Empleado): void {
    this.editando.set(e);
    this.form.reset({
      nombre: e.nombre,
      tipoDocumento: e.tipoDocumento,
      numeroDocumento: e.numeroDocumento,
      cargo: e.cargo ?? '',
      sucursalId: e.sucursalId ?? '',
      usuarioId: e.usuarioId ?? '',
      salarioMensual: Number(e.salarioMensual),
      aplicaHorasExtra: e.aplicaHorasExtra,
      pin: '',
    });
    this.mostrarForm.set(true);
  }

  protected errorPinForm(): string | null {
    const c = this.form.controls.pin;
    if (this.editando() || !c.touched) return null;
    return PIN.test(c.value) ? null : 'Entre 4 y 6 dígitos';
  }

  protected guardar(): void {
    const editando = this.editando();
    if (this.form.invalid || (!editando && !PIN.test(this.form.controls.pin.value))) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: EmpleadoPayload = {
      nombre: raw.nombre.trim(),
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: raw.numeroDocumento.trim(),
      cargo: raw.cargo.trim() || null,
      sucursalId: raw.sucursalId || null,
      salarioMensual: Number(raw.salarioMensual),
      aplicaHorasExtra: raw.aplicaHorasExtra,
    };
    // Sin permiso para ver usuarios el select no aparece: no tocar el vínculo existente.
    if (this.puedeVerUsuarios) payload.usuarioId = raw.usuarioId || null;
    if (!editando) payload.pin = raw.pin;
    this.guardando.set(true);
    const req = editando ? this.empleadosService.actualizar(editando.id, payload) : this.empleadosService.crear(payload);
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.toast.success(editando ? 'Empleado actualizado' : 'Empleado creado');
        this.cambio.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(this.mensaje(err, 'No se pudo guardar el empleado'));
      },
    });
  }

  protected abrirCambioPin(e: Empleado): void {
    this.nuevoPin.set('');
    this.errorPin.set(null);
    this.cambiandoPin.set(e);
  }

  protected guardarPin(): void {
    const e = this.cambiandoPin();
    if (!e) return;
    if (!PIN.test(this.nuevoPin())) {
      this.errorPin.set('Entre 4 y 6 dígitos');
      return;
    }
    this.guardando.set(true);
    this.empleadosService.cambiarPin(e.id, this.nuevoPin()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cambiandoPin.set(null);
        this.toast.success(`PIN de ${e.nombre} actualizado`);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorPin.set(this.mensaje(err, 'No se pudo cambiar el PIN'));
      },
    });
  }

  protected async desactivar(e: Empleado): Promise<void> {
    const ok = await this.confirm.ask({
      message: `¿Desactivar a ${e.nombre}? Ya no podrá marcar asistencia; sus jornadas siguen en los reportes.`,
      danger: true,
    });
    if (!ok) return;
    this.empleadosService.desactivar(e.id).subscribe({
      next: () => {
        this.toast.success(`${e.nombre} desactivado`);
        this.cambio.emit();
      },
      error: (err) => this.toast.error(this.mensaje(err, 'No se pudo desactivar')),
    });
  }

  private mensaje(err: { error?: { message?: string | string[] } }, porDefecto: string): string {
    const m = err.error?.message;
    return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
  }
}
