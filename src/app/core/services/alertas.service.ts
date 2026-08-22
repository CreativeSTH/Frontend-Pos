import { Injectable, effect, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Alerta, ResumenAlertas, SeveridadAlerta, TipoAlerta } from '../models/alerta.model';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  /** Contador de no-leídas para la campana del Topbar. */
  private readonly _noLeidas = signal(0);
  readonly noLeidas = this._noLeidas.asReadonly();

  constructor() {
    /** Mismo motivo que `CajaService`: singleton `providedIn: 'root'` — se refresca solo al cambiar de usuario/negocio. */
    effect(() => {
      const usuario = this.auth.usuario();
      if (!usuario || usuario.rolTier === 'SISTEMA' || !this.auth.tienePermiso('ALERTAS', 'VER')) {
        this._noLeidas.set(0);
        return;
      }
      this.refrescarConteo().subscribe();
    });
  }

  findAll(filtros: { tipo?: TipoAlerta; severidad?: SeveridadAlerta; resuelta?: boolean } = {}) {
    return this.api.get<Alerta[]>('/alertas', filtros);
  }

  resumen() {
    return this.api.get<ResumenAlertas>('/alertas/resumen');
  }

  generar() {
    return this.api.post<{ total: number }>('/alertas/generar', {});
  }

  resolver(id: string) {
    return this.api.patch<Alerta>(`/alertas/${id}/resolver`, {});
  }

  marcarLeida(id: string) {
    return this.api.patch<Alerta>(`/alertas/${id}/leida`, {});
  }

  /** Refresca `noLeidas` (alertas activas sin leer) — llamar al entrar al layout protegido o tras resolver/marcar leída. */
  refrescarConteo() {
    return this.findAll({ resuelta: false }).pipe(
      tap((alertas) => this._noLeidas.set(alertas.filter((a) => !a.leida).length)),
    );
  }
}
