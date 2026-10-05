import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Empleado, EmpleadoPayload, ReporteRecargos, TurnoPayload, TurnoProgramado } from '../models/empleado.model';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private readonly api = inject(ApiService);

  listar() {
    return this.api.get<Empleado[]>('/empleados');
  }

  crear(payload: EmpleadoPayload) {
    return this.api.post<Empleado>('/empleados', payload);
  }

  actualizar(id: string, payload: Partial<EmpleadoPayload>) {
    return this.api.patch<Empleado>(`/empleados/${id}`, payload);
  }

  cambiarPin(id: string, pin: string) {
    return this.api.patch<void>(`/empleados/${id}/pin`, { pin });
  }

  desactivar(id: string) {
    return this.api.delete<void>(`/empleados/${id}`);
  }

  turnos(desde: string, hasta: string, sucursalId?: string) {
    return this.api.get<TurnoProgramado[]>('/turnos-programados', { desde, hasta, sucursalId });
  }

  crearTurno(payload: TurnoPayload) {
    return this.api.post<TurnoProgramado>('/turnos-programados', payload);
  }

  actualizarTurno(id: string, payload: Partial<TurnoPayload>) {
    return this.api.patch<TurnoProgramado>(`/turnos-programados/${id}`, payload);
  }

  eliminarTurno(id: string) {
    return this.api.delete<void>(`/turnos-programados/${id}`);
  }

  copiarSemana(lunesDestino: string, sucursalId?: string) {
    return this.api.post<{ copiados: number; omitidos: number }>('/turnos-programados/copiar-semana', {
      lunesDestino,
      sucursalId,
    });
  }

  reporteRecargos(filtros: { desde: string; hasta: string; empleadoId?: string; sucursalId?: string }) {
    return this.api.get<ReporteRecargos>('/reportes/recargos', { ...filtros });
  }
}
