import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ClienteTienda, ClienteTiendaSesion } from '../models/cliente-tienda.model';

const CLAVE_TOKEN = 'pos_cliente_token';
const CLAVE_CLIENTE = 'pos_cliente_actual';

@Injectable({ providedIn: 'root' })
export class ClienteAuthService {
  private readonly api = inject(ApiService);

  private readonly _clienteActual = signal<ClienteTienda | null>(this.leerClienteGuardado());
  readonly clienteActual = this._clienteActual.asReadonly();

  get token(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  registrar(
    negocioId: string,
    dto: { nombre: string; telefono: string; password: string },
  ): Observable<ClienteTiendaSesion> {
    return this.api
      .post<ClienteTiendaSesion>(`/catalogo-cliente/${negocioId}/auth/registro`, dto)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  login(
    negocioId: string,
    dto: { telefono: string; password: string },
  ): Observable<ClienteTiendaSesion> {
    return this.api
      .post<ClienteTiendaSesion>(`/catalogo-cliente/${negocioId}/auth/login`, dto)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  guardarSesion(sesion: ClienteTiendaSesion): void {
    localStorage.setItem(CLAVE_TOKEN, sesion.accessToken);
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(sesion.cliente));
    this._clienteActual.set(sesion.cliente);
  }

  logout(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_CLIENTE);
    this._clienteActual.set(null);
  }

  private leerClienteGuardado(): ClienteTienda | null {
    const crudo = localStorage.getItem(CLAVE_CLIENTE);
    return crudo ? (JSON.parse(crudo) as ClienteTienda) : null;
  }
}
