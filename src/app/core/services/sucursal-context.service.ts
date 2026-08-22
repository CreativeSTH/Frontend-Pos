import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

const SUCURSAL_KEY = 'pos_sucursal_actual';

/**
 * Sucursal "activa" para usuarios sin `sucursalId` fijo (ADMIN_NEGOCIO/SUPER_ADMIN
 * que supervisan varias sucursales). Un cajero con `sucursalId` fijo siempre usa esa,
 * sin importar `elegir()`. Se resetea sola cuando cambia el usuario logueado (login,
 * pin-switch a otro usuario, entrar/salir de modo soporte) para no arrastrar la
 * elección de una sesión a otra.
 */
@Injectable({ providedIn: 'root' })
export class SucursalContextService {
  private readonly auth = inject(AuthService);

  private readonly _eleccionManual = signal<string | null>(localStorage.getItem(SUCURSAL_KEY));

  readonly sucursalId = computed(() => this.auth.usuario()?.sucursalId ?? this._eleccionManual());

  constructor() {
    let initialized = false;
    let lastUsuarioId: string | null = null;
    effect(() => {
      const usuarioId = this.auth.usuario()?.id ?? null;
      if (!initialized) {
        initialized = true;
        lastUsuarioId = usuarioId;
        return;
      }
      if (usuarioId !== lastUsuarioId) {
        lastUsuarioId = usuarioId;
        this.reset();
      }
    });
  }

  elegir(sucursalId: string): void {
    localStorage.setItem(SUCURSAL_KEY, sucursalId);
    this._eleccionManual.set(sucursalId);
  }

  reset(): void {
    localStorage.removeItem(SUCURSAL_KEY);
    this._eleccionManual.set(null);
  }
}
