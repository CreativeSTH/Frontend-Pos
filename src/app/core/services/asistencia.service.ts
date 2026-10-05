import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CorregirJornadaPayload,
  CrearJornadaPayload,
  FiltrosAsistencia,
  Jornada,
  ListadoAsistencia,
  ResultadoMarca,
} from '../models/empleado.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private readonly api = inject(ApiService);

  marcar(pin: string, sucursalId: string) {
    return this.api.post<ResultadoMarca>('/asistencia/marcar', { pin, sucursalId });
  }

  listar(filtros: FiltrosAsistencia) {
    return this.api.get<ListadoAsistencia>('/asistencia/jornadas', { ...filtros });
  }

  crearManual(payload: CrearJornadaPayload) {
    return this.api.post<Jornada>('/asistencia/jornadas', payload);
  }

  corregir(id: string, payload: CorregirJornadaPayload) {
    return this.api.patch<Jornada>(`/asistencia/jornadas/${id}`, payload);
  }

  eliminar(id: string, motivo: string) {
    return this.api.deleteConCuerpo<void>(`/asistencia/jornadas/${id}`, { motivo });
  }
}
