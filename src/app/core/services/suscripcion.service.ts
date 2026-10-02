import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  MedioPagoEstado,
  PaginaPagosSuscripcion,
  ReactivarSuscripcionPayload,
  Suscripcion,
} from '../models/suscripcion.model';

@Injectable({ providedIn: 'root' })
export class SuscripcionService {
  private readonly api = inject(ApiService);

  miEstado() {
    return this.api.get<Suscripcion>('/suscripcion/mi-estado');
  }

  reactivar(payload: ReactivarSuscripcionPayload) {
    return this.api.post<{ referencia: string; wompiTransactionId: string; extra?: Record<string, unknown> }>(
      '/suscripcion/reactivar',
      payload,
    );
  }

  medioPago() {
    return this.api.get<MedioPagoEstado>('/suscripcion/medio-pago');
  }

  /** Guarda o reemplaza la tarjeta del cobro automático, sin cobrar. Exige correo confirmado (403 si no). */
  guardarMedioPago(token: string, ultimosCuatroDigitos: string) {
    return this.api.post<MedioPagoEstado>('/suscripcion/medio-pago', { token, ultimosCuatroDigitos });
  }

  pagos(pagina: number, porPagina: number) {
    return this.api.get<PaginaPagosSuscripcion>('/suscripcion/pagos', { pagina, porPagina });
  }

  quitarMedioPago() {
    return this.api.delete<{ mensaje: string }>('/suscripcion/medio-pago');
  }

  cancelar(motivo?: string) {
    return this.api.post<Suscripcion>('/suscripcion/cancelar', { motivo });
  }

  revertirCancelacion() {
    return this.api.post<Suscripcion>('/suscripcion/revertir-cancelacion', {});
  }

  cambiarPaqueteEnPrueba(paqueteId: string) {
    return this.api.patch<Suscripcion>('/suscripcion/paquete-prueba', { paqueteId });
  }
}
