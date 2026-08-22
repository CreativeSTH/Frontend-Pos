import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Bodega } from '../models/bodega.model';

export interface BodegaPayload {
  sucursalId: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class BodegasService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Bodega[]>('/bodegas');
  }

  create(payload: BodegaPayload) {
    return this.api.post<Bodega>('/bodegas', payload);
  }

  update(id: string, payload: Partial<BodegaPayload>) {
    return this.api.patch<Bodega>(`/bodegas/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/bodegas/${id}`);
  }
}
