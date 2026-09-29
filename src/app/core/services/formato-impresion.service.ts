import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { FormatoImpresion } from '../models/formato-impresion.model';

@Injectable({ providedIn: 'root' })
export class FormatoImpresionService {
  private readonly api = inject(ApiService);

  obtener() {
    return this.api.get<FormatoImpresion>('/facturacion/formato');
  }

  actualizar(payload: { mensajeCierre: string | null; terminos: string | null }) {
    return this.api.patch<FormatoImpresion>('/facturacion/formato', payload);
  }
}
