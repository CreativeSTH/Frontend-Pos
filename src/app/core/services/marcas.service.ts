import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Marca } from '../models/marca.model';

export interface MarcaPayload {
  nombre: string;
  marcaPadreId?: string;
}

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Marca[]>('/marcas');
  }

  create(payload: MarcaPayload) {
    return this.api.post<Marca>('/marcas', payload);
  }

  update(id: string, payload: MarcaPayload) {
    return this.api.patch<Marca>(`/marcas/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/marcas/${id}`);
  }
}
