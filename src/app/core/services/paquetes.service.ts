import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreatePaquetePayload, Paquete, UpdatePaquetePayload } from '../models/paquete.model';

@Injectable({ providedIn: 'root' })
export class PaquetesService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Paquete[]>('/paquetes');
  }

  /** Igual que findAll(), pero sin requerir PAQUETES:VER — para el selector de plan al pagar/reactivar (ver SelectorPlanPago). */
  disponibles() {
    return this.api.get<Paquete[]>('/paquetes/disponibles');
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
