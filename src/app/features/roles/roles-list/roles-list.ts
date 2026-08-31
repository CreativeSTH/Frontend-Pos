import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
import { RolesService } from '../../../core/services/roles.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Permiso, Rol } from '../../../core/models/rol.model';
import { AccionPermiso, ModuloPermiso } from '../../../core/models/auth.model';

const ACCIONES: AccionPermiso[] = ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'];

const ETIQUETAS_MODULO: Record<ModuloPermiso, string> = {
  NEGOCIOS: 'Negocios',
  NEGOCIO: 'Datos del negocio',
  SUCURSALES: 'Sucursales',
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  PRODUCTOS: 'Productos',
  CATEGORIAS: 'Categorías',
  MARCAS: 'Marcas',
  LINEAS: 'Líneas',
  PROVEEDORES: 'Proveedores',
  BODEGAS: 'Bodegas',
  INVENTARIO: 'Inventario',
  VENTAS: 'Ventas',
  CAJA: 'Caja',
  COBROS: 'Cobros',
  CLIENTES: 'Clientes',
  DOMICILIOS: 'Domicilios',
  ALERTAS: 'Alertas',
  REPORTES: 'Reportes',
  METODOS_PAGO: 'Métodos de pago',
  GRAFICOS: 'Gráficos',
  FACTURACION: 'Facturación',
  CUPONES: 'Cupones y descuentos',
  PAGOS: 'Pagos con Wompi',
  TIENDA_ONLINE: 'Tienda online',
  PAQUETES: 'Paquetes',
};

const ETIQUETAS_ACCION: Record<AccionPermiso, string> = {
  VER: 'Ver',
  CREAR: 'Crear',
  EDITAR: 'Editar',
  ELIMINAR: 'Eliminar',
};

interface FilaMatriz {
  modulo: ModuloPermiso;
  etiqueta: string;
  celdas: { accion: AccionPermiso; permiso: Permiso | null }[];
}

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [Topbar, Button, Badge, Icon, Table, Modal, FormField, Input, EmptyState, Paginator, ReactiveFormsModule],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesList {
  private readonly rolesService = inject(RolesService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly acciones = ACCIONES;
  protected readonly etiquetasAccion = ETIQUETAS_ACCION;

  protected readonly loading = signal(true);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly catalogo = signal<Permiso[]>([]);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  protected readonly showPermisos = signal(false);
  protected readonly rolPermisos = signal<Rol | null>(null);
  protected readonly seleccionados = signal<Set<string>>(new Set());
  protected readonly savingPermisos = signal(false);

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.roles().length / this.pageSize)));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly rolesPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.roles().slice(inicio, inicio + this.pageSize);
  });

  protected readonly filasMatriz = computed<FilaMatriz[]>(() => {
    const porModulo = new Map<ModuloPermiso, Permiso[]>();
    for (const permiso of this.catalogo()) {
      const lista = porModulo.get(permiso.modulo) ?? [];
      lista.push(permiso);
      porModulo.set(permiso.modulo, lista);
    }
    return Array.from(porModulo.entries()).map(([modulo, permisos]) => ({
      modulo,
      etiqueta: ETIQUETAS_MODULO[modulo],
      celdas: ACCIONES.map((accion) => ({
        accion,
        permiso: permisos.find((p) => p.accion === accion) ?? null,
      })),
    }));
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      roles: this.rolesService.findAll(),
      catalogo: this.rolesService.catalogo(),
    }).subscribe({
      next: ({ roles, catalogo }) => {
        this.roles.set(roles);
        this.catalogo.set(catalogo);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los roles');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', descripcion: '' });
    this.showForm.set(true);
  }

  protected openEdit(rol: Rol): void {
    this.editingId.set(rol.id);
    this.form.reset({ nombre: rol.nombre, descripcion: rol.descripcion ?? '' });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = { nombre: raw.nombre, descripcion: raw.descripcion || undefined };
    const editingId = this.editingId();
    const request$ = editingId ? this.rolesService.update(editingId, payload) : this.rolesService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Rol actualizado' : 'Rol creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el rol');
      },
    });
  }

  protected async eliminar(rol: Rol): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar el rol "${rol.nombre}"?`, danger: true }))) return;
    this.rolesService.remove(rol.id).subscribe({
      next: () => {
        this.toast.success('Rol eliminado');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo eliminar el rol'),
    });
  }

  protected abrirPermisos(rol: Rol): void {
    this.rolPermisos.set(rol);
    this.seleccionados.set(new Set(rol.permisos.map((p) => p.id)));
    this.showPermisos.set(true);
  }

  protected marcado(permisoId: string | null): boolean {
    return !!permisoId && this.seleccionados().has(permisoId);
  }

  protected toggle(permisoId: string | null): void {
    if (!permisoId) return;
    this.seleccionados.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(permisoId)) {
        nuevo.delete(permisoId);
      } else {
        nuevo.add(permisoId);
      }
      return nuevo;
    });
  }

  protected guardarPermisos(): void {
    const rol = this.rolPermisos();
    if (!rol) return;
    this.savingPermisos.set(true);
    this.rolesService.actualizarPermisos(rol.id, Array.from(this.seleccionados())).subscribe({
      next: () => {
        this.savingPermisos.set(false);
        this.showPermisos.set(false);
        this.toast.success('Permisos actualizados');
        this.load();
      },
      error: (err) => {
        this.savingPermisos.set(false);
        this.toast.error(err.error?.message ?? 'No se pudieron guardar los permisos');
      },
    });
  }
}
