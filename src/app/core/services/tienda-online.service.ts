import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ConfiguracionTiendaOnline, PlantillaTienda } from '../models/tienda-online.model';

@Injectable({ providedIn: 'root' })
export class TiendaOnlineService {
  private readonly api = inject(ApiService);

  obtenerConfiguracion(): Observable<ConfiguracionTiendaOnline> {
    return this.api.get<ConfiguracionTiendaOnline>('/tienda-online/configuracion');
  }

  elegirBodega(bodegaId: string): Observable<void> {
    return this.api.patch<void>('/tienda-online/bodega', { bodegaId });
  }

  activar(): Observable<void> {
    return this.api.patch<void>('/tienda-online/activar', {});
  }

  desactivar(): Observable<void> {
    return this.api.patch<void>('/tienda-online/desactivar', {});
  }

  actualizarPlantilla(plantilla: PlantillaTienda): Observable<void> {
    return this.api.patch<void>('/tienda-online/plantilla', { plantilla });
  }

  actualizarLegales(dto: { terminos?: string; tratamientoDatos?: string; politicaEnvios?: string }): Observable<void> {
    return this.api.patch<void>('/tienda-online/legales', dto);
  }

  subirLogo(file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.api.post<{ logoUrl: string }>('/tienda-online/logo', formData);
  }

  subirBanner(file: File): Observable<{ banners: string[] }> {
    const formData = new FormData();
    formData.append('banner', file);
    return this.api.post<{ banners: string[] }>('/tienda-online/banners', formData);
  }

  eliminarBanner(index: number): Observable<{ banners: string[] }> {
    return this.api.delete<{ banners: string[] }>(`/tienda-online/banners/${index}`);
  }
}
