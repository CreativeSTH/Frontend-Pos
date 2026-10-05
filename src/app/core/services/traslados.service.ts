import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CrearTrasladoPayload,
  FiltrosTraslados,
  RecibirTrasladoPayload,
  Traslado,
} from '../models/traslado.model';

@Injectable({ providedIn: 'root' })
export class TrasladosService {
  private readonly api = inject(ApiService);

  listar(filtros: FiltrosTraslados = {}) {
    return this.api.get<Traslado[]>('/traslados', { ...filtros });
  }

  detalle(id: string) {
    return this.api.get<Traslado>(`/traslados/${id}`);
  }

  enviar(payload: CrearTrasladoPayload) {
    return this.api.post<Traslado>('/traslados', payload);
  }

  recibir(id: string, payload: RecibirTrasladoPayload) {
    return this.api.post<Traslado>(`/traslados/${id}/recibir`, payload);
  }

  cancelar(id: string) {
    return this.api.post<Traslado>(`/traslados/${id}/cancelar`, {});
  }
}
