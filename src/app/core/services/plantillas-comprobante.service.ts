import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ConfiguracionPlantilla, PlantillaComprobante, TipoComprobante } from '../models/plantilla-comprobante.model';

export interface PlantillaPayload {
  nombre: string;
  tipo: TipoComprobante;
  esPredeterminada?: boolean;
  configuracion?: ConfiguracionPlantilla;
}

@Injectable({ providedIn: 'root' })
export class PlantillasComprobanteService {
  private readonly api = inject(ApiService);

  findAll(tipo?: TipoComprobante) {
    return this.api.get<PlantillaComprobante[]>('/plantillas-comprobante', tipo ? { tipo } : undefined);
  }

  findOne(id: string) {
    return this.api.get<PlantillaComprobante>(`/plantillas-comprobante/${id}`);
  }

  create(payload: PlantillaPayload, logo?: File | null) {
    return this.api.post<PlantillaComprobante>('/plantillas-comprobante', this.toFormData(payload, logo));
  }

  update(id: string, payload: Partial<PlantillaPayload>, logo?: File | null) {
    return this.api.patch<PlantillaComprobante>(`/plantillas-comprobante/${id}`, this.toFormData(payload, logo));
  }

  remove(id: string) {
    return this.api.delete<void>(`/plantillas-comprobante/${id}`);
  }

  /** Mismo patrón que `ProductosService.toFormData()` — un campo opcional como archivo, el resto JSON. */
  private toFormData(payload: object, logo?: File | null): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    if (logo) {
      formData.append('logo', logo);
    }
    return formData;
  }
}
