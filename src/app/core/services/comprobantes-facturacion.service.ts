import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { FiltrosComprobantes, ListadoComprobantes } from '../models/comprobante-facturacion.model';

@Injectable({ providedIn: 'root' })
export class ComprobantesFacturacionService {
  private readonly api = inject(ApiService);

  /** Facturas electrónicas, recibos, históricos y recibos de caja, paginados en el servidor. */
  listar(filtros: FiltrosComprobantes) {
    return this.api.get<ListadoComprobantes>('/facturacion/comprobantes', { ...filtros });
  }
}
