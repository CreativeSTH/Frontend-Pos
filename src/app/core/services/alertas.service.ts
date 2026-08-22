import { Injectable, effect, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import {
  Alerta,
  CreateAlertaPayload,
  CreateReglaAlertaPayload,
  ReglaAlerta,
  ResumenAlertas,
  SeveridadAlerta,
  TipoAlerta,
} from '../models/alerta.model';

/** Intervalo de sondeo para que la campana se sienta "en vivo" sin necesidad de websockets. */
const POLL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  /** Contador de no-leídas para la campana del Topbar. */
  private readonly _noLeidas = signal(0);
  readonly noLeidas = this._noLeidas.asReadonly();

  /** Últimas alertas activas y no resueltas — misma fuente que alimenta el mini-panel de notificaciones. */
  private readonly _ultimasAlertas = signal<Alerta[]>([]);
  readonly ultimasAlertas = this._ultimasAlertas.asReadonly();

  constructor() {
    /**
     * Singleton `providedIn: 'root'` — se refresca solo al cambiar de
     * usuario/negocio (mismo motivo que `CajaService`), y además hace polling
     * cada 30s mientras la sesión esté activa para que las notificaciones
     * aparezcan solas (stock agotado durante una venta, cron cada 30 min,
     * etc.) sin que el usuario tenga que recargar la página ni apretar
     * "Actualizar". No hay websockets en el proyecto — este es el término
     * medio pragmático entre "en vivo de verdad" y no tener que montar
     * infraestructura de push nueva.
     */
    effect((onCleanup) => {
      const usuario = this.auth.usuario();
      if (!usuario || usuario.rolTier === 'SISTEMA' || !this.auth.tienePermiso('ALERTAS', 'VER')) {
        this._noLeidas.set(0);
        this._ultimasAlertas.set([]);
        return;
      }
      this.refrescarConteo().subscribe();
      const intervalId = setInterval(() => this.refrescarConteo().subscribe(), POLL_MS);
      onCleanup(() => clearInterval(intervalId));
    });
  }

  findAll(
    filtros: { tipo?: TipoAlerta; severidad?: SeveridadAlerta; resuelta?: boolean; activa?: boolean } = {},
  ) {
    return this.api.get<Alerta[]>('/alertas', filtros);
  }

  resumen() {
    return this.api.get<ResumenAlertas>('/alertas/resumen');
  }

  generar() {
    return this.api.post<{ total: number }>('/alertas/generar', {});
  }

  crear(payload: CreateAlertaPayload) {
    return this.api.post<Alerta>('/alertas', payload);
  }

  resolver(id: string) {
    return this.api.patch<Alerta>(`/alertas/${id}/resolver`, {});
  }

  marcarLeida(id: string) {
    return this.api.patch<Alerta>(`/alertas/${id}/leida`, {});
  }

  alternarActiva(id: string, activa: boolean) {
    return this.api.patch<Alerta>(`/alertas/${id}/activa`, { activa });
  }

  findReglas() {
    return this.api.get<ReglaAlerta[]>('/alertas/reglas');
  }

  crearRegla(payload: CreateReglaAlertaPayload) {
    return this.api.post<ReglaAlerta>('/alertas/reglas', payload);
  }

  actualizarRegla(id: string, payload: Partial<CreateReglaAlertaPayload>) {
    return this.api.patch<ReglaAlerta>(`/alertas/reglas/${id}`, payload);
  }

  eliminarRegla(id: string) {
    return this.api.delete<void>(`/alertas/reglas/${id}`);
  }

  /**
   * Refresca `noLeidas` y `ultimasAlertas` (últimas 5 activas sin resolver) —
   * llamar al entrar al layout protegido o tras resolver/marcar leída; el
   * propio servicio ya lo hace solo cada 30s mientras haya sesión.
   */
  refrescarConteo() {
    return this.findAll({ resuelta: false, activa: true }).pipe(
      tap((alertas) => {
        this._noLeidas.set(alertas.filter((a) => !a.leida).length);
        this._ultimasAlertas.set(alertas.slice(0, 5));
      }),
    );
  }
}
