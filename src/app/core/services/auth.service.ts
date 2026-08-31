import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AccionPermiso, LoginResponse, ModuloPermiso, PermisoResumen, UsuarioSesion } from '../models/auth.model';

const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_usuario';
const PERMISOS_KEY = 'pos_permisos';
const LOCK_KEY = 'pos_caja_pausada';
const SESION_PLATAFORMA_KEY = 'pos_sesion_plataforma';

interface SesionGuardada {
  token: string;
  usuario: UsuarioSesion;
  permisos: PermisoResumen[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _usuario = signal<UsuarioSesion | null>(this.readUsuarioFromStorage());
  readonly usuario = this._usuario.asReadonly();

  /**
   * Foto de los permisos del rol tomada al loguear/cambiar de PIN — solo
   * para conveniencia de UI (ocultar botones/menús). La autorización real
   * siempre la re-chequea el backend contra la DB en cada request, así que
   * esta foto puede quedar desactualizada hasta el próximo login sin riesgo
   * de seguridad — en el peor caso, un botón queda oculto de más.
   */
  private readonly _permisos = signal<PermisoResumen[]>(this.readPermisosFromStorage());

  readonly isAuthenticated = computed(() => this._usuario() !== null);
  readonly esSistema = computed(() => this._usuario()?.rolTier === 'SISTEMA');

  tienePermiso(modulo: ModuloPermiso, accion: AccionPermiso = 'VER'): boolean {
    return this._permisos().some((p) => p.modulo === modulo && p.accion === accion);
  }

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

  /**
   * "Modo soporte": un usuario de tier SISTEMA "entró" a operar un negocio
   * como su Administrador. Se guarda la sesión de plataforma aparte para
   * poder volver a ella con "Salir", sin tener que loguearse de nuevo.
   */
  private readonly _sesionPlataforma = signal<SesionGuardada | null>(this.readSesionPlataformaFromStorage());
  readonly enModoSoporte = computed(() => this._sesionPlataforma() !== null);

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

  confirmarEmail(token: string) {
    return this.api
      .get<LoginResponse>(`/auth/verificar-email?token=${encodeURIComponent(token)}`)
      .pipe(tap((response) => this.guardarSesion(response)));
  }

  reenviarVerificacion(email: string) {
    return this.api.post<{ mensaje: string }>('/auth/reenviar-verificacion', { email });
  }

  /** Emite una sesión como el Administrador del negocio elegido, guardando la sesión de plataforma actual aparte. */
  entrarComoNegocio(negocioId: string) {
    return this.api.post<LoginResponse>(`/auth/entrar-negocio/${negocioId}`, {}).pipe(
      tap((response) => {
        const usuarioActual = this._usuario();
        const token = this.token;
        if (usuarioActual && token) {
          const stash: SesionGuardada = { token, usuario: usuarioActual, permisos: this._permisos() };
          localStorage.setItem(SESION_PLATAFORMA_KEY, JSON.stringify(stash));
          this._sesionPlataforma.set(stash);
        }
        this.guardarSesion(response);
      }),
    );
  }

  /** Vuelve a la sesión de plataforma guardada antes de "entrar" a un negocio. */
  salirModoSoporte(): void {
    const stash = this._sesionPlataforma();
    if (!stash) return;
    localStorage.setItem(TOKEN_KEY, stash.token);
    localStorage.setItem(USER_KEY, JSON.stringify(stash.usuario));
    localStorage.setItem(PERMISOS_KEY, JSON.stringify(stash.permisos));
    localStorage.removeItem(SESION_PLATAFORMA_KEY);
    this._usuario.set(stash.usuario);
    this._permisos.set(stash.permisos);
    this._sesionPlataforma.set(null);
    this.router.navigateByUrl('/negocios');
  }

  private guardarSesion(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
    localStorage.setItem(PERMISOS_KEY, JSON.stringify(response.permisos));
    this._usuario.set(response.usuario);
    this._permisos.set(response.permisos);
    localStorage.removeItem(LOCK_KEY);
    this._locked.set(false);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMISOS_KEY);
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(SESION_PLATAFORMA_KEY);
    this._usuario.set(null);
    this._permisos.set([]);
    this._locked.set(false);
    this._sesionPlataforma.set(null);
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

  private readPermisosFromStorage(): PermisoResumen[] {
    const raw = localStorage.getItem(PERMISOS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PermisoResumen[];
    } catch {
      return [];
    }
  }

  private readSesionPlataformaFromStorage(): SesionGuardada | null {
    const raw = localStorage.getItem(SESION_PLATAFORMA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SesionGuardada;
    } catch {
      return null;
    }
  }
}
