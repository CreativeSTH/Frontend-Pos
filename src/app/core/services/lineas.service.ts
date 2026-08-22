import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Linea } from '../models/linea.model';

@Injectable({ providedIn: 'root' })
export class LineasService {
  private readonly api = inject(ApiService);

  findAll(marcaId?: string) {
    return this.api.get<Linea[]>('/lineas', { marcaId });
  }

  create(marcaId: string, nombre: string) {
    return this.api.post<Linea>('/lineas', { marcaId, nombre });
  }

  update(id: string, nombre: string) {
    return this.api.patch<Linea>(`/lineas/${id}`, { nombre });
  }

  remove(id: string) {
    return this.api.delete<void>(`/lineas/${id}`);
  }
}
