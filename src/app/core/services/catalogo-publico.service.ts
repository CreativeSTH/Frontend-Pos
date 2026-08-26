import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CatalogoTienda } from '../models/catalogo-publico.model';

@Injectable({ providedIn: 'root' })
export class CatalogoPublicoService {
  private readonly api = inject(ApiService);

  obtenerCatalogo(negocioId: string): Observable<CatalogoTienda> {
    return this.api.get<CatalogoTienda>(`/catalogo-cliente/${negocioId}/productos`);
  }
}
