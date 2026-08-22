import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CobroItem, CobrosTotales } from '../models/cobro.model';

@Injectable({ providedIn: 'root' })
export class CobrosService {
  private readonly api = inject(ApiService);

  pendientes() {
    return this.api.get<CobroItem[]>('/cobros/pendientes');
  }

  vencidos() {
    return this.api.get<CobroItem[]>('/cobros/vencidos');
  }

  proximaQuincena() {
    return this.api.get<CobroItem[]>('/cobros/proxima-quincena');
  }

  totales() {
    return this.api.get<CobrosTotales>('/cobros/totales');
  }
}
