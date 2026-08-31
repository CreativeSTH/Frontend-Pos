import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreatePaquetePayload, Paquete, UpdatePaquetePayload } from '../models/paquete.model';

@Injectable({ providedIn: 'root' })
export class PaquetesService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Paquete[]>('/paquetes');
  }

  create(payload: CreatePaquetePayload) {
    return this.api.post<Paquete>('/paquetes', payload);
  }

  update(id: string, payload: UpdatePaquetePayload) {
    return this.api.patch<Paquete>(`/paquetes/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/paquetes/${id}`);
  }
}
