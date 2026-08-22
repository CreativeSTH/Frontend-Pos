import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginResponse, UsuarioSesion } from '../models/auth.model';

const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_usuario';
const LOCK_KEY = 'pos_caja_pausada';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _usuario = signal<UsuarioSesion | null>(this.readUsuarioFromStorage());
  readonly usuario = this._usuario.asReadonly();

  readonly isAuthenticated = computed(() => this._usuario() !== null);
  readonly isSuperAdmin = computed(() => this._usuario()?.rol === 'SUPER_ADMIN');
  readonly isAdminNegocio = computed(() => this._usuario()?.rol === 'ADMIN_NEGOCIO');

  /**
   * "Pausar caja": bloquea toda la app con una pantalla de PIN sin cerrar el
   * turno ni perder el carrito en curso — a diferencia de "Cerrar caja",
   * que sí hace arqueo. Se persiste en localStorage para que un refresh no
   * la salte. Se desbloquea reutilizando `pinSwitch` (mismo cajero u otro).
   */
  private readonly _locked = signal<boolean>(localStorage.getItem(LOCK_KEY) === '1');
  readonly locked = this._locked.asReadonly();

  pausarCaja(): void {
    localStorage.setItem(LOCK_KEY, '1');
    this._locked.set(true);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string) {
    return this.api
      .post<LoginResponse>('/auth/login', { email, password })
      .pipe(tap((response) => this.guardarSesion(response)));
  }

  /** Cambio rápido de cajero por PIN — no pasa por /login, mantiene el negocio actual. */
  pinSwitch(pin: string) {
    return this.api.post<LoginResponse>('/auth/pin-switch', { pin }).pipe(tap((response) => this.guardarSesion(response)));
  }

  private guardarSesion(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
    this._usuario.set(response.usuario);
    localStorage.removeItem(LOCK_KEY);
    this._locked.set(false);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOCK_KEY);
    this._usuario.set(null);
    this._locked.set(false);
    this.router.navigateByUrl('/login');
  }

  private readUsuarioFromStorage(): UsuarioSesion | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }
}
