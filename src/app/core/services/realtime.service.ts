import { Injectable, effect, inject } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Canal push genérico por negocio — espejo frontend de `RealtimeGateway` en
 * el backend (`src/realtime/realtime.gateway.ts`). No sabe nada de
 * "alertas" ni de "domicilios" (entidad futura): solo conecta el socket y
 * expone `on()` para que cada servicio de dominio se suscriba a sus propios
 * eventos (`alertas:cambio` hoy, `domicilios:cambio` el día de mañana).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;

  /**
   * Los consumidores llaman `on()` una sola vez (al construirse, un
   * singleton `providedIn: 'root'` como AlertasService). El socket, en
   * cambio, se recrea cada vez que cambia el usuario/negocio — así que acá
   * se guardan los listeners para volver a engancharlos al socket nuevo.
   */
  private readonly listeners: [string, (payload: unknown) => void][] = [];

  constructor() {
    /**
     * Mismo patrón que AlertasService/CajaService: se reconecta solo al
     * cambiar de usuario/negocio (login, logout, soporte de otro negocio) —
     * el `onCleanup` cierra el socket viejo antes de abrir uno nuevo.
     * Un usuario tier SISTEMA no abre socket — no tiene sala de negocio a la
     * que unirse (mismo criterio que ya aplica a Alertas en el sidebar).
     */
    effect((onCleanup) => {
      const usuario = this.auth.usuario();
      const token = this.auth.token;
      if (!usuario || usuario.rolTier === 'SISTEMA' || !token) {
        this.socket = null;
        return;
      }

      const socket = io(environment.assetsUrl, { auth: { token } });
      for (const [evento, callback] of this.listeners) {
        socket.on(evento, callback);
      }
      this.socket = socket;
      onCleanup(() => socket.disconnect());
    });
  }

  /** Suscripción cruda a un evento del negocio actual — el consumidor decide qué hacer con el payload. */
  on<T>(evento: string, callback: (payload: T) => void): void {
    this.listeners.push([evento, callback as (payload: unknown) => void]);
    this.socket?.on(evento, callback);
  }
}
