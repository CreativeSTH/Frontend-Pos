import { Injectable, effect, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';
import {
  Alerta,
  CreateAlertaPayload,
  CreateReglaAlertaPayload,
  ReglaAlerta,
  ResumenAlertas,
  SeveridadAlerta,
  TipoAlerta,
} from '../models/alerta.model';

/**
 * El aviso "en vivo" ahora llega por WebSocket (`RealtimeService`, evento
 * `alertas:cambio`) — este intervalo queda como respaldo por si el socket
 * está caído (red inestable, reconectando), no como la vía principal.
 */
const POLL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);

  /** Contador de no-leídas para la campana del Topbar. */
  private readonly _noLeidas = signal(0);
  readonly noLeidas = this._noLeidas.asReadonly();

  /** Últimas alertas activas y no resueltas — misma fuente que alimenta el mini-panel de notificaciones. */
  private readonly _ultimasAlertas = signal<Alerta[]>([]);
  readonly ultimasAlertas = this._ultimasAlertas.asReadonly();

  constructor() {
    /**
     * Vía principal: WebSocket (`RealtimeService`) — el backend emite
     * `alertas:cambio` a la sala del negocio apenas se crea/actualiza una
     * alerta (venta que agota stock, cron, reglas, etc.), así que cualquier
     * sesión abierta del negocio se entera al instante, no solo la que
     * disparó el cambio. Se registra una sola vez — `RealtimeService`
     * reengancha este listener solo si el socket se reconecta.
     */
    this.realtime.on('alertas:cambio', () => this.refrescarConteo().subscribe());

    /**
     * Singleton `providedIn: 'root'` — se refresca solo al cambiar de
     * usuario/negocio (mismo motivo que `CajaService`), y además hace polling
     * de respaldo mientras la sesión esté activa, por si el socket está
     * caído (red inestable, reconectando) — ver `POLL_MS`.
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
