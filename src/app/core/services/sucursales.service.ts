import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Sucursal } from '../models/sucursal.model';

export interface SucursalPayload {
  nombre: string;
  direccion?: string;
  telefono?: string;
  metaVentasDiaria?: number;
  tipoComprobanteDefecto?: 'RECIBO' | 'FACTURA';
  plantillaReciboDefectoId?: string;
  plantillaFacturaDefectoId?: string;
}

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Sucursal[]>('/sucursales');
  }

  create(payload: SucursalPayload) {
    return this.api.post<Sucursal>('/sucursales', payload);
  }

  update(id: string, payload: Partial<SucursalPayload>) {
    return this.api.patch<Sucursal>(`/sucursales/${id}`, payload);
  }

  /** Setea o limpia (null) el default de plantilla de recibo/factura de una sucursal — usado por el wizard de Facturación. */
  updateDefaultPlantilla(
    id: string,
    campo: 'plantillaReciboDefectoId' | 'plantillaFacturaDefectoId',
    valor: string | null,
  ) {
    return this.api.patch<Sucursal>(`/sucursales/${id}`, { [campo]: valor });
  }

  remove(id: string) {
    return this.api.delete<void>(`/sucursales/${id}`);
  }
}
