import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateRolPayload, Permiso, Rol, UpdateRolPayload } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Rol[]>('/roles');
  }

  findOne(id: string) {
    return this.api.get<Rol>(`/roles/${id}`);
  }

  catalogo() {
    return this.api.get<Permiso[]>('/roles/catalogo');
  }

  create(payload: CreateRolPayload) {
    return this.api.post<Rol>('/roles', payload);
  }

  update(id: string, payload: UpdateRolPayload) {
    return this.api.patch<Rol>(`/roles/${id}`, payload);
  }

  actualizarPermisos(id: string, permisoIds: string[]) {
    return this.api.patch<Rol>(`/roles/${id}/permisos`, { permisoIds });
  }

  remove(id: string) {
    return this.api.delete<void>(`/roles/${id}`);
  }
}
