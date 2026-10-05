import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { EnlaceAyuda } from '../../../shared/ui/molecules/enlace-ayuda/enlace-ayuda';
import { formatMoney } from '../../pos/punto-venta/pos-shared.util';
import { EmpleadosService } from '../../../core/services/empleados.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  AlertaAsistencia,
  AlertaRecargos,
  ETIQUETA_TIPO_HORA,
  Empleado,
  RecargosEmpleado,
  ReporteRecargos,
  TipoHora,
} from '../../../core/models/empleado.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { etiquetaFecha, horaColombia, hoyColombia } from '../../../shared/utils/fecha-colombia.util';
import { descargarCsv } from '../../../shared/utils/csv.util';

/** Columnas de la tabla: cada una suma uno o más tipos de hora. La ordinaria diurna va en el salario. */
const COLUMNAS: { titulo: string; tipos: TipoHora[] }[] = [
  { titulo: 'Recargo nocturno', tipos: ['ORDINARIA_NOCTURNA'] },
  { titulo: 'Dominical o festivo', tipos: ['ORDINARIA_DIURNA_DOMINICAL', 'ORDINARIA_NOCTURNA_DOMINICAL'] },
  { titulo: 'Extra diurna', tipos: ['EXTRA_DIURNA'] },
  { titulo: 'Extra nocturna', tipos: ['EXTRA_NOCTURNA'] },
  { titulo: 'Extra dominical o festiva', tipos: ['EXTRA_DIURNA_DOMINICAL', 'EXTRA_NOCTURNA_DOMINICAL'] },
];

/** Horas con hasta 2 decimales y coma: 150 min → '2,5'. */
function horas(minutos: number): string {
  return String(Math.round((minutos / 60) * 100) / 100).replace('.', ',');
}

/** Reporte de horas extra y recargos en pesos (spec 2026-10-04 turnos §7). No es nómina. */
@Component({
  selector: 'app-reporte-recargos',
  standalone: true,
  imports: [FormsModule, Topbar, Button, Badge, Icon, Select, Table, EmptyState, EnlaceAyuda],
  templateUrl: './reporte-recargos.html',
  styleUrl: './reporte-recargos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteRecargosPage {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);

  protected readonly columnas = COLUMNAS;
  protected readonly etiquetaTipo = ETIQUETA_TIPO_HORA;
  protected readonly horas = horas;
  /** 0.35 → '35'; 1.15 → '115'. */
  protected readonly porcentaje = (p: number) => String(Math.round(p * 10000) / 100).replace('.', ',');
  protected readonly dinero = (v: number) => formatMoney(v);
  protected readonly hora = horaColombia;
  protected readonly dia = (fecha: string) => etiquetaFecha(fecha, { weekday: 'short', day: 'numeric', month: 'short' });

  protected readonly desde = signal(`${hoyColombia().slice(0, 8)}01`);
  protected readonly hasta = signal(hoyColombia());
  protected readonly sucursalId = signal('');
  protected readonly empleadoId = signal('');
  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly cargando = signal(false);
  protected readonly reporte = signal<ReporteRecargos | null>(null);
  protected readonly abiertos = signal<Set<string>>(new Set());

  private readonly nombreEmpleado = computed(() => new Map(this.empleados().map((e) => [e.id, e.nombre])));

  protected readonly resumenAsistencia = computed(() => {
    const alertas = this.reporte()?.alertasAsistencia ?? [];
    const contar = (tipo: AlertaAsistencia['tipo']) => alertas.filter((a) => a.tipo === tipo).length;
    return { tarde: contar('TARDE'), ausente: contar('AUSENTE'), sinSalida: contar('SIN_SALIDA'), lista: alertas };
  });

  constructor() {
    this.empleadosService.listar().subscribe((e) => this.empleados.set([...e].sort((a, b) => a.nombre.localeCompare(b.nombre))));
    this.sucursalesService.findAll().subscribe((s) => this.sucursales.set(s.filter((x) => x.activo !== false)));
    this.calcular();
  }

  protected calcular(): void {
    if (!this.desde() || !this.hasta()) return;
    this.cargando.set(true);
    this.empleadosService
      .reporteRecargos({
        desde: this.desde(),
        hasta: this.hasta(),
        empleadoId: this.empleadoId() || undefined,
        sucursalId: this.sucursalId() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.reporte.set(r);
          this.abiertos.set(new Set());
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          const m = err.error?.message;
          this.toast.error((Array.isArray(m) ? m[0] : m) ?? 'No se pudo calcular el reporte');
        },
      });
  }

  protected celda(r: RecargosEmpleado, tipos: TipoHora[]): { minutos: number; valor: number } {
    return tipos.reduce((acc, t) => ({ minutos: acc.minutos + r.porTipo[t].minutos, valor: acc.valor + r.porTipo[t].valor }), {
      minutos: 0,
      valor: 0,
    });
  }

  protected totalColumna(tipos: TipoHora[]): number {
    return (this.reporte()?.empleados ?? []).reduce((s, r) => s + this.celda(r, tipos).valor, 0);
  }

  protected alternar(id: string): void {
    this.abiertos.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /** Solo los tramos que valen algo: la hora ordinaria diurna ya está pagada con el salario. */
  protected tramosConRecargo(r: RecargosEmpleado) {
    return r.tramos.filter((t) => t.porcentaje > 0);
  }

  protected textoAlertaRecargo(a: AlertaRecargos): string {
    return a.tipo === 'EXTRA_DIA'
      ? `${horas(a.minutos)} h extra el ${this.dia(a.fecha)} (el máximo legal es 2 h al día)`
      : `${horas(a.minutos)} h extra en la semana del ${this.dia(a.fecha)} (el máximo legal es 12 h)`;
  }

  protected textoAlertaAsistencia(a: AlertaAsistencia): string {
    const nombre = this.nombreEmpleado().get(a.empleadoId) ?? 'Empleado';
    if (a.tipo === 'TARDE') return `${nombre} llegó ${a.minutos} min tarde el ${this.dia(a.fecha)}`;
    if (a.tipo === 'AUSENTE') return `${nombre} no marcó en su turno del ${this.dia(a.fecha)}`;
    return `${nombre} tiene una jornada sin salida el ${this.dia(a.fecha)}: corrígela en Asistencia para que cuente`;
  }

  protected exportar(): void {
    const r = this.reporte();
    if (!r) return;
    const filas: (string | number)[][] = [['Empleado', 'Documento', 'Tipo de hora', 'Horas', 'Porcentaje', 'Valor']];
    for (const e of r.empleados) {
      for (const tipo of Object.keys(ETIQUETA_TIPO_HORA) as TipoHora[]) {
        const { minutos, valor } = e.porTipo[tipo];
        if (minutos <= 0) continue;
        const porcentajes = [...new Set(e.tramos.filter((t) => t.tipo === tipo).map((t) => Math.round(t.porcentaje * 100)))];
        filas.push([
          e.empleado.nombre,
          `${e.empleado.tipoDocumento} ${e.empleado.numeroDocumento}`,
          ETIQUETA_TIPO_HORA[tipo],
          Math.round((minutos / 60) * 100) / 100,
          porcentajes.length === 1 ? `${porcentajes[0]} %` : porcentajes.map((p) => `${p} %`).join(' / '),
          valor,
        ]);
      }
      filas.push([e.empleado.nombre, `${e.empleado.tipoDocumento} ${e.empleado.numeroDocumento}`, 'Total', '', '', e.total]);
    }
    filas.push([], [r.nota]);
    descargarCsv(`recargos_${r.desde}_${r.hasta}.csv`, filas);
  }
}
