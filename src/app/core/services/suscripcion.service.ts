import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ReactivarSuscripcionPayload, Suscripcion } from '../models/suscripcion.model';

@Injectable({ providedIn: 'root' })
export class SuscripcionService {
  private readonly api = inject(ApiService);

  miEstado() {
    return this.api.get<Suscripcion>('/suscripcion/mi-estado');
  }

  reactivar(payload: ReactivarSuscripcionPayload) {
    return this.api.post<{ referencia: string; wompiTransactionId: string; extra?: Record<string, unknown> }>(
      '/suscripcion/reactivar',
      payload,
    );
  }
}
