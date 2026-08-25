import { Injectable, inject } from '@angular/core';
import { Observable, ReplaySubject, filter, map, merge, take } from 'rxjs';
import { ApiService } from './api.service';
import { RealtimeService } from './realtime.service';
import {
  ConfiguracionWompi,
  GuardarConfiguracionWompiPayload,
  IniciarPagoWompiPayload,
  PagoWompiIniciado,
} from '../models/pago-wompi.model';

@Injectable({ providedIn: 'root' })
export class PagosWompiService {
  private readonly api = inject(ApiService);
  private readonly realtime = inject(RealtimeService);

  /**
   * `RealtimeService.on()` registra un listener permanente (se reengancha
   * solo si el socket se reconecta, pero nunca se puede desregistrar) —
   * mismo patrón que `AlertasService`/`DomiciliosService`: se suscribe una
   * sola vez acá, en el constructor del singleton `providedIn: 'root'`, y
   * republica cada evento en este `Subject` para que `esperarResultado()`
   * pueda filtrar por referencia en cada llamada sin acumular un listener
   * nuevo por cada intento de cobro. Es `ReplaySubject(1)` (no `Subject` liso)
   * para cubrir la ventana de carrera pre-suscripción: si la confirmación
   * realtime llega justo entre que `iniciarPago()` resuelve y el llamador
   * se suscribe con `esperarResultado()`, el evento no se pierde — el
   * filtro por referencia de abajo evita que un evento repetido resuelva
   * la llamada equivocada.
   */
  private readonly confirmaciones$ = new ReplaySubject<{ referencia: string }>(1);
  /** Mismo patrón que `confirmaciones$`, para el caso DECLINADA — antes el backend no avisaba nada en este caso y el cajero quedaba esperando para siempre. */
  private readonly declinaciones$ = new ReplaySubject<{ referencia: string }>(1);

  constructor() {
    this.realtime.on<{ referencia: string }>('pago-wompi:confirmado', (evento) => this.confirmaciones$.next(evento));
    this.realtime.on<{ referencia: string }>('pago-wompi:declinado', (evento) => this.declinaciones$.next(evento));
  }

  obtenerConfiguracion(): Observable<ConfiguracionWompi> {
    return this.api.get<ConfiguracionWompi>('/pagos/wompi/configuracion');
  }

  guardarConfiguracion(dto: GuardarConfiguracionWompiPayload): Observable<void> {
    return this.api.post<void>('/pagos/wompi/configuracion', dto);
  }

  activar(): Observable<void> {
    return this.api.patch<void>('/pagos/wompi/activar', {});
  }

  desactivar(): Observable<void> {
    return this.api.patch<void>('/pagos/wompi/desactivar', {});
  }

  iniciarPago(dto: IniciarPagoWompiPayload): Observable<PagoWompiIniciado> {
    return this.api.post<PagoWompiIniciado>('/pagos/wompi/iniciar', dto);
  }

  /**
   * Se resuelve con el resultado TERMINAL (aprobado o declinado) la primera vez que llega
   * cualquiera de los dos eventos realtime (`pago-wompi:confirmado`/`:declinado`) con esa
   * referencia puntual — lo que llegue primero. Antes solo se escuchaba `:confirmado`, así que
   * un pago declinado/cancelado dejaba al cajero esperando para siempre sin ninguna señal.
   */
  esperarResultado(referencia: string): Observable<{ aprobado: boolean }> {
    return merge(
      this.confirmaciones$.pipe(map((evento) => ({ ...evento, aprobado: true }))),
      this.declinaciones$.pipe(map((evento) => ({ ...evento, aprobado: false }))),
    ).pipe(
      filter((evento) => evento.referencia === referencia),
      take(1),
      map(({ aprobado }) => ({ aprobado })),
    );
  }
}
