import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Bodega } from '../models/bodega.model';

export interface BodegaPayload {
  nombre: string;
  /** Vacío = bodega central (CEDI). */
  sucursalIds: string[];
}

@Injectable({ providedIn: 'root' })
export class BodegasService {
  private readonly api = inject(ApiService);

  /** Con `sucursalId`, solo las bodegas asociadas a esa sucursal. */
  findAll(sucursalId?: string) {
    return this.api.get<Bodega[]>('/bodegas', sucursalId ? { sucursalId } : undefined);
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
