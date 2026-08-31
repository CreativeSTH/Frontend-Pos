import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateNegocioPayload, Negocio, UpdateNegocioPayload } from '../models/negocio.model';
import { RegistroPublicoPayload } from '../models/suscripcion.model';

@Injectable({ providedIn: 'root' })
export class NegociosService {
  private readonly api = inject(ApiService);

  registroPublico(payload: RegistroPublicoPayload) {
    return this.api.post<{ mensaje: string }>('/negocios/registro-publico', payload);
  }

  findAll() {
    return this.api.get<Negocio[]>('/negocios');
  }

  create(payload: CreateNegocioPayload) {
    return this.api.post<Negocio>('/negocios', payload);
  }

  update(id: string, payload: UpdateNegocioPayload) {
    return this.api.patch<Negocio>(`/negocios/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/negocios/${id}`);
  }

  /** Datos del propio negocio del usuario autenticado — gateado por NEGOCIO (tier negocio), no por NEGOCIOS (tier sistema). */
  miNegocio() {
    return this.api.get<Negocio>('/negocios/mi-negocio');
  }

  actualizarMiNegocio(payload: UpdateNegocioPayload) {
    return this.api.patch<Negocio>('/negocios/mi-negocio', payload);
  }
}
