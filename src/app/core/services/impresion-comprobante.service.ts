import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { VentasService } from './ventas.service';
import { PrintAgentService, OpcionesImpresion } from './print-agent.service';
import { ToastService } from './toast.service';

export type ResultadoImpresion = 'AGENTE' | 'NAVEGADOR' | 'FALLIDO';

/**
 * Único flujo de impresión de un comprobante de venta (antes copiado en POS, Ventas y Caja):
 * pide el contenido resuelto al backend, intenta el pos-agent y, si no está (o es viejo para
 * facturas electrónicas), abre el respaldo del navegador.
 */
@Injectable({ providedIn: 'root' })
export class ImpresionComprobanteService {
  private readonly ventasService = inject(VentasService);
  private readonly printAgent = inject(PrintAgentService);
  private readonly toast = inject(ToastService);

  imprimir(ventaId: string, opciones: OpcionesImpresion = {}): Observable<ResultadoImpresion> {
    return this.ventasService.obtenerComprobante(ventaId).pipe(
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
        this.toast.error('No se pudo obtener el comprobante de esta venta');
        return of<ResultadoImpresion>('FALLIDO');
      }),
    );
  }
}
