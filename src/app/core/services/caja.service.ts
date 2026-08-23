import { Injectable, effect, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { SucursalContextService } from './sucursal-context.service';
import { ResumenTurno, TurnoCaja } from '../models/caja.model';
import { MovimientoCaja, TipoMovimientoCaja } from '../models/movimiento-caja.model';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly api = inject(ApiService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly auth = inject(AuthService);

  /** Fuente de verdad global de "¿hay un turno de caja abierto?" — usada por el layout (landing, sidebar en modo hamburguesa). */
  private readonly _turnoAbierto = signal<TurnoCaja | null>(null);
  readonly turnoAbierto = this._turnoAbierto.asReadonly();

  constructor() {
    /**
     * Este signal es un singleton `providedIn: 'root'` — sobrevive a cambios de
     * sesión sin recrearse (a diferencia de un componente de ruta), así que se
     * refresca solo cada vez que cambia el usuario logueado (login, pin-switch,
     * "entrar como negocio", "salir de modo soporte"). Sin esto, cambiar de
     * negocio con "entrar como" dejaba el turno del negocio ANTERIOR visible —
     * cerrar ese turno fallaba con 404 porque ya no pertenecía al negocio activo.
     */
    effect(() => {
      const usuario = this.auth.usuario();
      if (!usuario || usuario.rolTier === 'SISTEMA') {
        this._turnoAbierto.set(null);
        return;
      }
      // Un admin multi-sucursal aún sin elegir sucursal no tiene forma de saber
      // "el" turno abierto sin adivinar entre sucursales — se deja en null (sin
      // FAB ni modo hamburguesa prematuro) hasta que sucursalGuard/landingGuard
      // resuelvan la sucursal, momento en el que este effect se re-dispara solo.
      const sucursalId = usuario.sucursalId ?? this.sucursalContext.sucursalId();
      if (!sucursalId) {
        this._turnoAbierto.set(null);
        return;
      }
      this.refrescarTurnoAbierto().subscribe();
    });
  }

  /**
   * Sin `sucursalId`, trae todos los turnos del negocio — lo usa `landingGuard`
   * a propósito, antes de que el usuario haya elegido sucursal. Con el context
   * ya resuelto (cajero con sucursal fija, o admin que ya eligió), se filtra.
   */
  findAllTurnos(sucursalId?: string) {
    const filtro = sucursalId ?? this.sucursalContext.sucursalId() ?? undefined;
    return this.api.get<TurnoCaja[]>('/caja/turnos', filtro ? { sucursalId: filtro } : undefined);
  }

  /** Refresca `turnoAbierto` desde el backend — llamar al entrar al layout protegido o tras deep links. */
  refrescarTurnoAbierto() {
    return this.findAllTurnos().pipe(
      tap((turnos) => this._turnoAbierto.set(turnos.find((t) => t.estado === 'ABIERTO') ?? null)),
    );
  }

  abrirTurno(sucursalId: string, montoInicial: number) {
    return this.api
      .post<TurnoCaja>('/caja/turnos/abrir', { sucursalId, montoInicial })
      .pipe(tap((turno) => this._turnoAbierto.set(turno)));
  }

  resumenTurno(id: string) {
    return this.api.get<ResumenTurno>(`/caja/turnos/${id}/resumen`);
  }

  cerrarTurno(id: string, montosContados: { metodoPago: string; monto: number }[]) {
    return this.api
      .post<TurnoCaja>(`/caja/turnos/${id}/cerrar`, { montosContados })
      .pipe(tap(() => this._turnoAbierto.set(null)));
  }

  pagarDescuadre(id: string, monto: number) {
    return this.api.patch<TurnoCaja>(`/caja/turnos/${id}/pagar-descuadre`, { monto });
  }

  listarMovimientos(turnoId: string) {
    return this.api.get<MovimientoCaja[]>(`/caja/turnos/${turnoId}/movimientos`);
  }

  registrarMovimiento(turnoId: string, tipo: TipoMovimientoCaja, monto: number, concepto?: string) {
    return this.api.post<MovimientoCaja>('/caja/movimientos', { turnoId, tipo, monto, concepto });
  }
}
