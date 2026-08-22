import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Categoria } from '../models/categoria.model';

export interface CategoriaPayload {
  nombre: string;
  categoriaPadreId?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Categoria[]>('/categorias');
  }

  create(payload: CategoriaPayload) {
    return this.api.post<Categoria>('/categorias', payload);
  }

  update(id: string, payload: CategoriaPayload) {
    return this.api.patch<Categoria>(`/categorias/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/categorias/${id}`);
  }
}
