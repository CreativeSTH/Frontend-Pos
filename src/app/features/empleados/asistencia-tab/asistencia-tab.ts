import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { AsistenciaService } from '../../../core/services/asistencia.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AlertaAsistencia, Empleado, Jornada, TurnoProgramado } from '../../../core/models/empleado.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import {
  duracionLegible,
  etiquetaFecha,
  horaColombia,
  hoyColombia,
  isoColombia,
  lunesDe,
} from '../../../shared/utils/fecha-colombia.util';

interface FormJornada {
  /** null = jornada nueva (manual). */
  jornada: Jornada | null;
  empleadoId: string;
  sucursalId: string;
  fechaEntrada: string;
  horaEntrada: string;
  fechaSalida: string;
  horaSalida: string;
  motivo: string;
}

@Component({
  selector: 'app-asistencia-tab',
  standalone: true,
  imports: [FormsModule, Button, Badge, Icon, Input, Select, Table, Modal, FormField, EmptyState, EnlaceAyuda],
  templateUrl: './asistencia-tab.html',
  styleUrl: './asistencia-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenciaTab {
  private readonly asistencia = inject(AsistenciaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly empleados = input.required<Empleado[]>();
  readonly sucursales = input.required<Sucursal[]>();

  protected readonly puedeEditar = this.auth.tienePermiso('EMPLEADOS', 'EDITAR');
  protected readonly hora = horaColombia;
  protected readonly fechaDe = (iso: string) => hoyColombia(new Date(iso));
  protected readonly diaLegible = (fecha: string) => etiquetaFecha(fecha, { weekday: 'short', day: 'numeric', month: 'short' });

  protected readonly desde = signal(lunesDe(hoyColombia()));
  protected readonly hasta = signal(hoyColombia());
  protected readonly empleadoId = signal('');
  protected readonly sucursalId = signal('');
  protected readonly cargando = signal(true);
  protected readonly jornadas = signal<Jornada[]>([]);
  protected readonly turnos = signal<TurnoProgramado[]>([]);
  protected readonly alertas = signal<AlertaAsistencia[]>([]);

  protected readonly form = signal<FormJornada | null>(null);
  protected readonly aEliminar = signal<Jornada | null>(null);
  protected readonly motivoEliminar = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);

  private readonly tardePorJornada = computed(() => {
    const mapa = new Map<string, number>();
    for (const a of this.alertas()) if (a.tipo === 'TARDE' && a.jornadaId) mapa.set(a.jornadaId, a.minutos ?? 0);
    return mapa;
  });

  protected readonly ausencias = computed(() => {
    const turnos = new Map(this.turnos().map((t) => [t.id, t]));
    return this.alertas()
      .filter((a) => a.tipo === 'AUSENTE' && a.turnoId && turnos.has(a.turnoId))
      .map((a) => turnos.get(a.turnoId!)!);
  });

  private readonly nombreSucursal = computed(() => new Map(this.sucursales().map((s) => [s.id, s.nombre])));

  constructor() {
    this.cargar();
  }

  protected filtrar(campo: 'desde' | 'hasta' | 'empleadoId' | 'sucursalId', valor: string): void {
    this[campo].set(valor ?? '');
    if (this.desde() && this.hasta()) this.cargar();
  }

  protected tarde(j: Jornada): number | undefined {
    return this.tardePorJornada().get(j.id);
  }

  protected duracion(j: Jornada): string {
    if (!j.salida) return '—';
    return duracionLegible((new Date(j.salida).getTime() - new Date(j.entrada).getTime()) / 60000);
  }

  protected sucursal(id: string): string {
    return this.nombreSucursal().get(id) ?? '—';
  }

  protected empleadoNombre(id: string): string {
    return this.empleados().find((e) => e.id === id)?.nombre ?? '—';
  }

  protected agregar(): void {
    const hoy = hoyColombia();
    this.errorForm.set(null);
    this.form.set({
      jornada: null,
      empleadoId: this.empleadoId() || this.empleados()[0]?.id || '',
      sucursalId: this.sucursalId() || this.sucursales()[0]?.id || '',
      fechaEntrada: hoy,
      horaEntrada: '08:00',
      fechaSalida: hoy,
      horaSalida: '',
      motivo: '',
    });
  }

  protected corregir(j: Jornada): void {
    this.errorForm.set(null);
    this.form.set({
      jornada: j,
      empleadoId: j.empleadoId,
      sucursalId: j.sucursalId,
      fechaEntrada: this.fechaDe(j.entrada),
      horaEntrada: horaColombia(j.entrada),
      fechaSalida: j.salida ? this.fechaDe(j.salida) : this.fechaDe(j.entrada),
      horaSalida: j.salida ? horaColombia(j.salida) : '',
      motivo: '',
    });
  }

  protected actualizarForm(campo: keyof Omit<FormJornada, 'jornada'>, valor: string): void {
    this.form.update((f) => (f ? { ...f, [campo]: valor ?? '' } : f));
  }

  protected guardar(): void {
    const f = this.form();
    if (!f) return;
    if (f.motivo.trim().length < 3) {
      this.errorForm.set('Escribe el motivo de la corrección');
      return;
    }
    if (!f.fechaEntrada || !f.horaEntrada) {
      this.errorForm.set('Indica la fecha y hora de entrada');
      return;
    }
    const entrada = isoColombia(f.fechaEntrada, f.horaEntrada);
    const salida = f.horaSalida && f.fechaSalida ? isoColombia(f.fechaSalida, f.horaSalida) : undefined;
    this.guardando.set(true);
    // Se compara a nivel de minuto (lo que muestra el formulario): reenviar la hora original sin sus
    // segundos la "corregiría" sin que nadie la haya tocado.
    const minuto = (iso: string | null) => (iso ? `${this.fechaDe(iso)} ${horaColombia(iso)}` : null);
    const req = f.jornada
      ? this.asistencia.corregir(f.jornada.id, {
          entrada: `${f.fechaEntrada} ${f.horaEntrada}` !== minuto(f.jornada.entrada) ? entrada : undefined,
          salida: salida && `${f.fechaSalida} ${f.horaSalida}` !== minuto(f.jornada.salida) ? salida : undefined,
          motivo: f.motivo.trim(),
        })
      : this.asistencia.crearManual({ empleadoId: f.empleadoId, sucursalId: f.sucursalId, entrada, salida, motivo: f.motivo.trim() });
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.set(null);
        this.toast.success(f.jornada ? 'Jornada corregida' : 'Jornada agregada');
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(this.mensaje(err, 'No se pudo guardar la jornada'));
      },
    });
  }

  protected pedirEliminar(j: Jornada): void {
    this.motivoEliminar.set('');
    this.errorForm.set(null);
    this.aEliminar.set(j);
  }

  protected eliminar(): void {
    const j = this.aEliminar();
    if (!j) return;
    if (this.motivoEliminar().trim().length < 3) {
      this.errorForm.set('Escribe por qué eliminas esta jornada');
      return;
    }
    this.guardando.set(true);
    this.asistencia.eliminar(j.id, this.motivoEliminar().trim()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.aEliminar.set(null);
        this.toast.success('Jornada eliminada');
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(this.mensaje(err, 'No se pudo eliminar la jornada'));
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.asistencia
      .listar({
        desde: this.desde(),
        hasta: this.hasta(),
        empleadoId: this.empleadoId() || undefined,
        sucursalId: this.sucursalId() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.jornadas.set(r.jornadas);
          this.turnos.set(r.turnos);
          this.alertas.set(r.alertas);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.toast.error(this.mensaje(err, 'No se pudo cargar la asistencia'));
        },
      });
  }

  private mensaje(err: { error?: { message?: string | string[] } }, porDefecto: string): string {
    const m = err.error?.message;
    return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
  }
}
