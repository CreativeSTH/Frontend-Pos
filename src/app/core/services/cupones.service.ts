import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  PrecioVigente,
  Promocion,
  PromocionPayload,
  TipoPromocion,
  ValidarCuponPayload,
  ValidarCuponResultado,
} from '../models/promocion.model';

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private readonly api = inject(ApiService);

  findAll(tipo?: TipoPromocion) {
    return this.api.get<Promocion[]>('/cupones', tipo ? { tipo } : undefined);
  }

  findOne(id: string) {
    return this.api.get<Promocion>(`/cupones/${id}`);
  }

  create(payload: PromocionPayload) {
    return this.api.post<Promocion>('/cupones', payload);
  }

  update(id: string, payload: Partial<PromocionPayload>) {
    return this.api.patch<Promocion>(`/cupones/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/cupones/${id}`);
  }

  preciosVigentes(sucursalId: string, bodegaId: string) {
    return this.api.get<PrecioVigente[]>('/cupones/precios-vigentes', { sucursalId, bodegaId });
  }

  validar(payload: ValidarCuponPayload) {
    return this.api.post<ValidarCuponResultado>('/cupones/validar', payload);
  }
}
