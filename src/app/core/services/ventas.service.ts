import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateVentaPayload, MetodoPago, Venta } from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Venta[]>('/ventas');
  }

  findOne(id: string) {
    return this.api.get<Venta>(`/ventas/${id}`);
  }

  create(payload: CreateVentaPayload) {
    return this.api.post<Venta>('/ventas', payload);
  }

  cancelar(id: string, motivo: string, devolverStock = true, pinAutorizacion?: string) {
    return this.api.post<Venta>(`/ventas/${id}/cancelar`, { motivo, devolverStock, pinAutorizacion });
  }

  abonarCuota(
    ventaId: string,
    payload: { numeroCuota: number; montoAbono: number; metodoPago: MetodoPago; referenciaPago?: string; notas?: string },
  ) {
    return this.api.patch(`/ventas/${ventaId}/abonar-cuota`, payload);
  }
}
