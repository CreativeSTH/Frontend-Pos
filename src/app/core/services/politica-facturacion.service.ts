import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SuscripcionService } from './suscripcion.service';
import { RealtimeService } from './realtime.service';
import { DeclaracionPerfilFiscal, EstadoFacturacion } from '../models/politica-facturacion.model';

/**
 * Estado de la política de facturación del negocio en un signal compartido: lo leen el banner,
 * el modal de perfil fiscal y (fase 2) el POS. Se carga desde el `dashboard-layout` al cambiar de usuario.
 */
@Injectable({ providedIn: 'root' })
export class PoliticaFacturacionService {
  private readonly api = inject(ApiService);
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly realtime = inject(RealtimeService);
  private readonly _estado = signal<EstadoFacturacion | null>(null);
  readonly estado = this._estado.asReadonly();

  /**
   * Suscripción vencida (solo lectura) o bloqueada: el backend rechaza cualquier escritura, incluida
   * la declaración del perfil fiscal. El modal espera a que se reactive — reactivar es lo primero.
   */
  private readonly _suscripcionInactiva = signal(false);
  readonly suscripcionInactiva = this._suscripcionInactiva.asReadonly();

  constructor() {
    // Al confirmarse la reactivación (u otro cambio de la suscripción) se recarga, y el modal
    // de perfil fiscal aparece solo si todavía falta declararlo.
    this.realtime.on('suscripcion:cambio', () => this.cargar());
  }

  /** Al pasar a un usuario de tier SISTEMA (p. ej. "Salir" del modo soporte) — no pertenece a un negocio. */
  limpiar(): void {
    this._estado.set(null);
    this._suscripcionInactiva.set(false);
  }

  cargar(): void {
    this.api.get<EstadoFacturacion>('/politica-facturacion/estado').subscribe({
      next: (estado) => this._estado.set(estado),
      error: () => {}, // silencioso, mismo criterio que los banners: no ensuciar la consola en cada navegación
    });
    this.suscripcionService.miEstado().subscribe({
      next: (suscripcion) => this._suscripcionInactiva.set(suscripcion.enGracia || suscripcion.bloqueado),
      error: () => {}, // si no se puede saber, no se frena el modal por esto
    });
  }

  declararPerfil(payload: DeclaracionPerfilFiscal): Observable<EstadoFacturacion> {
    return this.api
      .patch<EstadoFacturacion>('/politica-facturacion/perfil-fiscal', payload)
      .pipe(tap((estado) => this._estado.set(estado)));
  }
}
