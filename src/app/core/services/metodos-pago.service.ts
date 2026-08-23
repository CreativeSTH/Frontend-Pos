import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { MetodoPago } from '../models/metodo-pago.model';

export interface MetodoPagoPayload {
  nombre: string;
  esEfectivo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MetodosPagoService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<MetodoPago[]>('/metodos-pago');
  }

  create(payload: MetodoPagoPayload) {
    return this.api.post<MetodoPago>('/metodos-pago', payload);
  }

  update(id: string, payload: MetodoPagoPayload) {
    return this.api.patch<MetodoPago>(`/metodos-pago/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/metodos-pago/${id}`);
  }
}
