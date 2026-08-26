import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ClienteTienda } from '../models/cliente-tienda.model';

export interface DireccionTienda {
  id: string;
  etiqueta?: string;
  direccionLinea1: string;
  direccionLinea2?: string;
  barrio?: string;
  predeterminada: boolean;
}

export interface NuevaDireccionTienda {
  etiqueta?: string;
  direccionLinea1: string;
  direccionLinea2?: string;
  barrio?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientePerfilService {
  private readonly api = inject(ApiService);

  obtenerPerfil(): Observable<ClienteTienda> {
    return this.api.get<ClienteTienda>('/catalogo-cliente/perfil');
  }

  listarDirecciones(): Observable<DireccionTienda[]> {
    return this.api.get<DireccionTienda[]>('/catalogo-cliente/direcciones');
  }

  agregarDireccion(dto: NuevaDireccionTienda): Observable<DireccionTienda> {
    return this.api.post<DireccionTienda>('/catalogo-cliente/direcciones', dto);
  }

  listarPedidos(): Observable<unknown[]> {
    return this.api.get<unknown[]>('/catalogo-cliente/pedidos');
  }
}
