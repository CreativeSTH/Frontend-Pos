import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { EmpleadosService } from '../../../core/services/empleados.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Empleado, TurnoProgramado } from '../../../core/models/empleado.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import {
  diaSemana,
  duracionLegible,
  etiquetaFecha,
  hoyColombia,
  lunesDe,
  minutosTurno,
  sumarDias,
} from '../../../shared/utils/fecha-colombia.util';
import { esFestivo, jornadaMaximaSemanal } from '../../../shared/utils/festivos-colombia';

interface FormTurno {
  id: string | null;
  empleadoId: string;
  sucursalId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  nota: string;
}

@Component({
  selector: 'app-horario-tab',
  standalone: true,
  imports: [FormsModule, Button, Badge, Icon, Input, Select, Modal, FormField, EmptyState],
  templateUrl: './horario-tab.html',
  styleUrl: './horario-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorarioTab {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly empleados = input.required<Empleado[]>();
  readonly sucursales = input.required<Sucursal[]>();

  protected readonly puedeCrear = this.auth.tienePermiso('EMPLEADOS', 'CREAR');
  protected readonly puedeEditar = this.auth.tienePermiso('EMPLEADOS', 'EDITAR');
  protected readonly puedeEliminar = this.auth.tienePermiso('EMPLEADOS', 'ELIMINAR');

  protected readonly semana = signal(lunesDe(hoyColombia()));
  protected readonly sucursalId = signal('');
  protected readonly turnos = signal<TurnoProgramado[]>([]);
  protected readonly cargando = signal(false);
  protected readonly copiando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly form = signal<FormTurno | null>(null);
  protected readonly errorForm = signal<string | null>(null);

  protected readonly hoy = hoyColombia();
  protected readonly dias = computed(() => Array.from({ length: 7 }, (_, i) => sumarDias(this.semana(), i)));
  /** Jornada máxima semanal vigente el lunes de la semana (Ley 2101 de 2021). */
  protected readonly jornadaMaxima = computed(() => jornadaMaximaSemanal(this.semana()));

  /** Con filtro de sucursal: quienes trabajan ahí habitualmente, los sin sucursal fija y quien tenga turnos ahí esa semana. */
  protected readonly filas = computed(() => {
    const suc = this.sucursalId();
    if (!suc) return this.empleados();
    const conTurno = new Set(this.turnos().map((t) => t.empleadoId));
    return this.empleados().filter((e) => !e.sucursalId || e.sucursalId === suc || conTurno.has(e.id));
  });

  private readonly porCelda = computed(() => {
    const mapa = new Map<string, TurnoProgramado[]>();
    for (const t of this.turnos()) {
      const clave = `${t.empleadoId}|${t.fecha}`;
      mapa.set(clave, [...(mapa.get(clave) ?? []), t]);
    }
    return mapa;
  });

  private readonly minutosPorEmpleado = computed(() => {
    const mapa = new Map<string, number>();
    for (const t of this.turnos()) mapa.set(t.empleadoId, (mapa.get(t.empleadoId) ?? 0) + minutosTurno(t.horaInicio, t.horaFin));
    return mapa;
  });

  private readonly nombreSucursal = computed(() => new Map(this.sucursales().map((s) => [s.id, s.nombre])));

  constructor() {
    effect(() => {
      const desde = this.semana();
      const suc = this.sucursalId();
      untracked(() => this.cargar(desde, suc));
    });
  }

  protected turnosDe(empleadoId: string, fecha: string): TurnoProgramado[] {
    return this.porCelda().get(`${empleadoId}|${fecha}`) ?? [];
  }

  protected totalSemana(empleadoId: string): number {
    return this.minutosPorEmpleado().get(empleadoId) ?? 0;
  }

  protected readonly duracion = duracionLegible;
  protected readonly fecha = etiquetaFecha;

  protected esDomingo(fecha: string): boolean {
    return diaSemana(fecha) === 0;
  }

  protected readonly esFestivo = esFestivo;

  protected hora(h: string): string {
    return h.slice(0, 5);
  }

  protected sucursalDe(id: string): string {
    return this.nombreSucursal().get(id) ?? '';
  }

  protected moverSemana(semanas: number): void {
    this.semana.update((s) => sumarDias(s, semanas * 7));
  }

  protected irAHoy(): void {
    this.semana.set(lunesDe(hoyColombia()));
  }

  protected nuevo(empleado: Empleado, fecha: string): void {
    if (!this.puedeCrear) return;
    this.errorForm.set(null);
    this.form.set({
      id: null,
      empleadoId: empleado.id,
      sucursalId: this.sucursalId() || empleado.sucursalId || this.sucursales()[0]?.id || '',
      fecha,
      horaInicio: '08:00',
      horaFin: '16:00',
      nota: '',
    });
  }

  protected editar(t: TurnoProgramado, evento: Event): void {
    evento.stopPropagation();
    if (!this.puedeEditar && !this.puedeEliminar) return;
    this.errorForm.set(null);
    this.form.set({
      id: t.id,
      empleadoId: t.empleadoId,
      sucursalId: t.sucursalId,
      fecha: t.fecha,
      horaInicio: this.hora(t.horaInicio),
      horaFin: this.hora(t.horaFin),
      nota: t.nota ?? '',
    });
  }

  protected actualizarForm(campo: keyof FormTurno, valor: string): void {
    this.form.update((f) => (f ? { ...f, [campo]: valor } : f));
  }

  protected cruzaMedianoche(f: FormTurno): boolean {
    return !!f.horaInicio && !!f.horaFin && f.horaFin <= f.horaInicio && f.horaFin !== f.horaInicio;
  }

  protected guardar(): void {
    const f = this.form();
    if (!f) return;
    if (!f.empleadoId || !f.sucursalId || !f.fecha || !f.horaInicio || !f.horaFin) {
      this.errorForm.set('Completa empleado, sucursal, fecha y horas');
      return;
    }
    const payload = {
      empleadoId: f.empleadoId,
      sucursalId: f.sucursalId,
      fecha: f.fecha,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
      nota: f.nota.trim() || null,
    };
    this.guardando.set(true);
    const req = f.id ? this.empleadosService.actualizarTurno(f.id, payload) : this.empleadosService.crearTurno(payload);
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.set(null);
        this.recargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(this.mensaje(err, 'No se pudo guardar el turno'));
      },
    });
  }

  protected async eliminar(): Promise<void> {
    const f = this.form();
    if (!f?.id) return;
    const ok = await this.confirm.ask({ message: `¿Eliminar el turno de ${f.horaInicio} a ${f.horaFin}?`, danger: true });
    if (!ok) return;
    this.empleadosService.eliminarTurno(f.id).subscribe({
      next: () => {
        this.form.set(null);
        this.recargar();
      },
      error: (err) => this.errorForm.set(this.mensaje(err, 'No se pudo eliminar el turno')),
    });
  }

  protected copiarSemanaAnterior(): void {
    this.copiando.set(true);
    this.empleadosService.copiarSemana(this.semana(), this.sucursalId() || undefined).subscribe({
      next: (r) => {
        this.copiando.set(false);
        if (r.copiados === 0 && r.omitidos === 0) this.toast.info('La semana anterior no tiene turnos para copiar');
        else this.toast.success(`Copiados ${r.copiados}, omitidos ${r.omitidos}`);
        this.recargar();
      },
      error: (err) => {
        this.copiando.set(false);
        this.toast.error(this.mensaje(err, 'No se pudo copiar la semana'));
      },
    });
  }

  private recargar(): void {
    this.cargar(this.semana(), this.sucursalId());
  }

  private cargar(desde: string, sucursalId: string): void {
    this.cargando.set(true);
    this.empleadosService.turnos(desde, sumarDias(desde, 6), sucursalId || undefined).subscribe({
      next: (t) => {
        this.turnos.set(t);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el horario');
      },
    });
  }

  private mensaje(err: { error?: { message?: string | string[] } }, porDefecto: string): string {
    const m = err.error?.message;
    return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
  }
}
