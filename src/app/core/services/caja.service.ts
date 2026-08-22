import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { ResumenTurno, TurnoCaja } from '../models/caja.model';
import { MovimientoCaja, TipoMovimientoCaja } from '../models/movimiento-caja.model';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly api = inject(ApiService);

  /** Fuente de verdad global de "¿hay un turno de caja abierto?" — usada por el layout (landing, sidebar en modo hamburguesa). */
  private readonly _turnoAbierto = signal<TurnoCaja | null>(null);
  readonly turnoAbierto = this._turnoAbierto.asReadonly();

  findAllTurnos() {
    return this.api.get<TurnoCaja[]>('/caja/turnos');
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
