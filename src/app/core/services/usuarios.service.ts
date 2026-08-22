import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateUsuarioPayload, UpdateUsuarioPayload, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Usuario[]>('/usuarios');
  }

  create(payload: CreateUsuarioPayload) {
    return this.api.post<Usuario>('/usuarios', payload);
  }

  update(id: string, payload: UpdateUsuarioPayload) {
    return this.api.patch<Usuario>(`/usuarios/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/usuarios/${id}`);
  }
}
