import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ConfiguracionTiendaOnline } from '../models/tienda-online.model';

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
}
