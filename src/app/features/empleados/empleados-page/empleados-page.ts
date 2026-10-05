import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Topbar } from '../../../layout/topbar/topbar';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { EmpleadosService } from '../../../core/services/empleados.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import { Empleado } from '../../../core/models/empleado.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EmpleadosTab } from '../empleados-tab/empleados-tab';
import { HorarioTab } from '../horario-tab/horario-tab';
import { AsistenciaTab } from '../asistencia-tab/asistencia-tab';

type Pestana = 'empleados' | 'horario' | 'asistencia';

/** Empleados, horario semanal y asistencia (spec 2026-10-04 turnos §7). */
@Component({
  selector: 'app-empleados-page',
  standalone: true,
  imports: [Topbar, EnlaceAyuda, EmpleadosTab, HorarioTab, AsistenciaTab],
  templateUrl: './empleados-page.html',
  styleUrl: './empleados-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadosPage {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);

  protected readonly pestana = signal<Pestana>('empleados');
  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.sucursalesService.findAll().subscribe((s) => this.sucursales.set(s.filter((x) => x.activo !== false)));
    this.recargarEmpleados();
  }

  protected recargarEmpleados(): void {
    this.empleadosService.listar().subscribe({
      next: (lista) => {
        this.empleados.set([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los empleados');
      },
    });
  }
}
