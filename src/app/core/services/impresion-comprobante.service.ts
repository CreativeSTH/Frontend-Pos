import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { VentasService } from './ventas.service';
import { DevolucionesService } from './devoluciones.service';
import { PrintAgentService, OpcionesImpresion } from './print-agent.service';
import { ToastService } from './toast.service';
import { ReciboContenido } from '../models/recibo-contenido.model';

export type ResultadoImpresion = 'AGENTE' | 'NAVEGADOR' | 'FALLIDO';

/**
 * Único flujo de impresión de un comprobante de venta (antes copiado en POS, Ventas y Caja):
 * pide el contenido resuelto al backend, intenta el pos-agent y, si no está (o es viejo para
 * facturas electrónicas), abre el respaldo del navegador.
 */
@Injectable({ providedIn: 'root' })
export class ImpresionComprobanteService {
  private readonly ventasService = inject(VentasService);
  private readonly devoluciones = inject(DevolucionesService);
  private readonly printAgent = inject(PrintAgentService);
  private readonly toast = inject(ToastService);

  imprimir(ventaId: string, opciones: OpcionesImpresion = {}): Observable<ResultadoImpresion> {
    return this.imprimirContenido(
      this.ventasService.obtenerComprobante(ventaId),
      opciones,
      'No se pudo obtener el comprobante de esta venta',
    );
  }

  /** Recibo de caja de un abono a crédito (fase 4); la fase 5 lo usa para reimprimir. */
  imprimirAbono(abonoId: string, opciones: OpcionesImpresion = {}): Observable<ResultadoImpresion> {
    return this.imprimirContenido(
      this.ventasService.obtenerComprobanteAbono(abonoId),
      opciones,
      'No se pudo obtener el recibo de caja de este abono',
    );
  }

  /** Comprobante de una devolución (DEV-n y, si la hay, su nota crédito). */
  imprimirDevolucion(devolucionId: string, opciones: OpcionesImpresion = {}): Observable<ResultadoImpresion> {
    return this.imprimirContenido(
      this.devoluciones.comprobante(devolucionId),
      opciones,
      'No se pudo obtener el comprobante de esta devolución',
    );
  }

  private imprimirContenido(
    contenido$: Observable<ReciboContenido>,
    opciones: OpcionesImpresion,
    mensajeError: string,
  ): Observable<ResultadoImpresion> {
    return contenido$.pipe(
      switchMap((contenido) =>
        this.printAgent.imprimirTicket(contenido, opciones).pipe(
          map((resultado): ResultadoImpresion => {
            if (resultado.impreso) return 'AGENTE';
            this.toast.info(
              resultado.error?.includes('actualízalo')
                ? 'El agente de impresión está desactualizado — abriendo el comprobante en el navegador'
                : 'Agente de impresión no disponible — abriendo el comprobante en el navegador',
            );
            return this.printAgent.imprimirReciboNavegador(contenido, opciones) ? 'NAVEGADOR' : 'FALLIDO';
          }),
        ),
      ),
      catchError(() => {
        this.toast.error(mensajeError);
        return of<ResultadoImpresion>('FALLIDO');
      }),
    );
  }
}
