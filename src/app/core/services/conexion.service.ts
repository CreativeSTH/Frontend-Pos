import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const PRUEBA_CADA_MS = 15_000;

/**
 * ¿El error es por falta de conexión con el backend? `0` = el navegador no llegó; `504` = el service
 * worker (producción) no llegó a la red y responde Gateway Timeout en su lugar.
 */
export function esErrorDeConexion(error: { status?: number } | null | undefined): boolean {
  return error?.status === 0 || error?.status === 504;
}

/**
 * ¿Hay conexión con el backend? (fase 6b). Cae a "sin conexión" con `offline` del navegador o con
 * cualquier respuesta `status 0` (lo marca `conexionInterceptor`); mientras tanto prueba
 * `/health/ping` cada 15 s y vuelve a "en línea" cuando responde.
 */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  private readonly _enLinea = signal(navigator.onLine);
  readonly enLinea = this._enLinea.asReadonly();
  private sondeo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    window.addEventListener('offline', () => this.marcarSinConexion());
    window.addEventListener('online', () => void this.verificar());
    if (!navigator.onLine) this.iniciarSondeo();
  }

  marcarSinConexion(): void {
    if (this._enLinea()) this._enLinea.set(false);
    this.iniciarSondeo();
  }

  async verificar(): Promise<boolean> {
    try {
      const r = await fetch(`${environment.apiUrl}/health/ping`, { cache: 'no-store' });
      if (r.ok) {
        this._enLinea.set(true);
        this.detenerSondeo();
        return true;
      }
    } catch {
      // sigue sin conexión
    }
    this._enLinea.set(false);
    return false;
  }

  private iniciarSondeo(): void {
    if (this.sondeo) return;
    this.sondeo = setInterval(() => void this.verificar(), PRUEBA_CADA_MS);
  }

  private detenerSondeo(): void {
    if (this.sondeo) clearInterval(this.sondeo);
    this.sondeo = null;
  }
}
