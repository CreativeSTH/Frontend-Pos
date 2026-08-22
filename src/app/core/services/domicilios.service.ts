import { Injectable, effect, inject, signal } from '@angular/core';
import { map, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';
import { ToastService } from './toast.service';
import { Domicilio, EstadoDomicilio } from '../models/domicilio.model';

/** Respaldo si el socket está caído — la vía principal es `domicilios:cambio`. */
const POLL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class DomiciliosService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);

  /** Domicilios NUEVO/EN_CAMINO — lo que necesita el panel rápido del POS y el badge. */
  private readonly _activos = signal<Domicilio[]>([]);
  readonly activos = this._activos.asReadonly();

  constructor() {
    /**
     * Un domicilio nace siempre en estado NUEVO y nunca vuelve a NUEVO después
     * (ver flujo en el backend) — así que un evento con `estado === 'NUEVO'`
     * identifica de forma confiable "domicilio recién creado", sin necesitar
     * un evento de socket aparte solo para el toast.
     */
    this.realtime.on<Domicilio>('domicilios:cambio', (domicilio) => {
      if (domicilio.estado === 'NUEVO') {
        this.toast.info(`Nuevo domicilio para ${domicilio.nombreCliente}`);
      }
      this.refrescarActivos().subscribe();
    });

    effect((onCleanup) => {
      const usuario = this.auth.usuario();
      if (!usuario || usuario.rolTier === 'SISTEMA' || !this.auth.tienePermiso('DOMICILIOS', 'VER')) {
        this._activos.set([]);
        return;
      }
      this.refrescarActivos().subscribe();
      const intervalId = setInterval(() => this.refrescarActivos().subscribe(), POLL_MS);
      onCleanup(() => clearInterval(intervalId));
    });
  }

  findAll(estado?: EstadoDomicilio, sucursalId?: string) {
    const params: Record<string, string> = {};
    if (estado) params['estado'] = estado;
    if (sucursalId) params['sucursalId'] = sucursalId;
    return this.api.get<Domicilio[]>('/domicilios', params);
  }

  marcarEnCamino(id: string, domiciliarioNombre?: string) {
    return this.api.patch<Domicilio>(`/domicilios/${id}/en-camino`, { domiciliarioNombre });
  }

  marcarEntregado(id: string) {
    return this.api.patch<Domicilio>(`/domicilios/${id}/entregado`, {});
  }

  cancelar(id: string, motivo?: string) {
    return this.api.patch<Domicilio>(`/domicilios/${id}/cancelar`, { motivo });
  }

  private refrescarActivos() {
    return this.findAll().pipe(
      map((lista) => lista.filter((d) => d.estado === 'NUEVO' || d.estado === 'EN_CAMINO')),
      tap((activos) => this._activos.set(activos)),
    );
  }
}
