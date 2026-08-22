import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateNegocioPayload, Negocio, UpdateNegocioPayload } from '../models/negocio.model';

@Injectable({ providedIn: 'root' })
export class NegociosService {
  private readonly api = inject(ApiService);

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
}
