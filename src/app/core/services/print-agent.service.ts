import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Venta } from '../models/venta.model';

interface PrintResult {
  impreso: boolean;
  error?: string;
}

export interface AgentStatus {
  ok: boolean;
  agente?: string;
  version?: string;
}

export interface AgentPrinterConfig {
  printerType?: 'epson' | 'star';
  printerName?: string;
}

@Injectable({ providedIn: 'root' })
export class PrintAgentService {
  private readonly http = inject(HttpClient);

  /** Estado del pos-agent en ESTA pc — no hay nada que consultar en el backend, es puramente local. */
  estado() {
    return this.http
      .get<AgentStatus>(`${environment.agentUrl}/status`)
      .pipe(catchError(() => of<AgentStatus>({ ok: false })));
  }

  /** Impresoras instaladas en esta PC (requiere Windows) — para el selector de Configuración > Dispositivos. */
  listarImpresoras() {
    return this.http
      .get<{ impresoras: string[]; error?: string }>(`${environment.agentUrl}/printers`)
      .pipe(catchError(() => of({ impresoras: [] as string[], error: 'Agente de impresión no disponible' })));
  }

  obtenerConfig() {
    return this.http
      .get<AgentPrinterConfig>(`${environment.agentUrl}/config`)
      .pipe(catchError(() => of<AgentPrinterConfig>({})));
  }

  guardarConfig(config: AgentPrinterConfig) {
    return this.http.post<AgentPrinterConfig>(`${environment.agentUrl}/config`, config);
  }

  imprimirPrueba() {
    return this.http
      .post<PrintResult>(`${environment.agentUrl}/print-test`, {})
      .pipe(catchError(() => of<PrintResult>({ impreso: false, error: 'Agente de impresión no disponible' })));
  }

  /**
   * Best-effort: si el pos-agent no está corriendo en esta PC, no debe
   * romper el flujo de venta — solo se informa que no se pudo imprimir.
   */
  imprimirTicket(negocioNombre: string, venta: Venta) {
    const payload = {
      tipo: 'TICKET_VENTA',
      negocio: { nombre: negocioNombre },
      venta: {
        numero: venta.id.slice(0, 8),
        fecha: venta.createdAt,
        items: venta.items.map((item) => ({
          nombre: item.nombreProducto,
          cantidad: item.cantidad,
          subtotal: item.subtotal,
        })),
        subtotal: venta.subtotal,
        impuesto: venta.impuestoTotal,
        total: venta.total,
        pagos: (venta.pagos ?? []).map((p) => ({ metodo: p.metodoPago, monto: p.monto })),
      },
      abrirCajon: true,
    };

    return this.http.post<PrintResult>(`${environment.agentUrl}/print`, payload).pipe(
      catchError(() => of<PrintResult>({ impreso: false, error: 'Agente de impresión no disponible' })),
    );
  }

  /**
   * Fallback cuando el pos-agent no está disponible (o el negocio nunca lo
   * instaló): abre una ventana aparte con el recibo listo para imprimir
   * desde el navegador. No depende de Angular ni de estilos de la app —
   * intencionalmente HTML plano, para que salga limpio en cualquier
   * impresora sin arrastrar el sidebar/fondo de la SPA.
   */
  imprimirReciboNavegador(negocioNombre: string, venta: Venta): boolean {
    const ventana = window.open('', '_blank', 'width=380,height=600');
    if (!ventana) return false;
    ventana.document.write(this.construirHtmlRecibo(negocioNombre, venta));
    ventana.document.close();
    ventana.focus();
    ventana.onload = () => ventana.print();
    return true;
  }

  private construirHtmlRecibo(negocioNombre: string, venta: Venta): string {
    const money = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
    const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(venta.createdAt),
    );

    const filasItems = venta.items
      .map(
        (item) => `
          <tr>
            <td>${this.escapar(item.nombreProducto)}</td>
            <td class="num">${item.cantidad}</td>
            <td class="num">${money(item.subtotal)}</td>
          </tr>`,
      )
      .join('');

    const filasPagos = (venta.pagos ?? [])
      .map(
        (pago) => `
          <tr>
            <td>${this.escapar(pago.metodoPago)}</td>
            <td class="num">${money(pago.monto)}</td>
          </tr>`,
      )
      .join('');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${venta.id.slice(0, 8)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 300px;
    margin: 0 auto;
    padding: 16px;
    color: #000;
    font-size: 13px;
  }
  h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
  .meta { text-align: center; font-size: 11px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 2px 0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .totales td { padding: 1px 0; }
  .totales .label { color: #333; }
  .total-final td { font-weight: bold; font-size: 14px; padding-top: 4px; }
  .footer { text-align: center; margin-top: 16px; font-size: 11px; }
</style>
</head>
<body>
  <h1>${this.escapar(negocioNombre || 'Recibo de venta')}</h1>
  <div class="meta">Venta #${venta.id.slice(0, 8)} · ${fecha}<br />${this.escapar(venta.nombreCliente)}</div>
  <hr />
  <table>
    <thead>
      <tr><td>Producto</td><td class="num">Cant.</td><td class="num">Subtotal</td></tr>
    </thead>
    <tbody>${filasItems}</tbody>
  </table>
  <hr />
  <table class="totales">
    <tr><td class="label">Subtotal</td><td class="num">${money(venta.subtotal)}</td></tr>
    ${venta.descuentoTotal > 0 ? `<tr><td class="label">Descuento</td><td class="num">-${money(venta.descuentoTotal)}</td></tr>` : ''}
    <tr><td class="label">IVA</td><td class="num">${money(venta.impuestoTotal)}</td></tr>
    <tr class="total-final"><td>Total</td><td class="num">${money(venta.total)}</td></tr>
  </table>
  ${
    filasPagos
      ? `<hr /><table>${filasPagos}</table>`
      : ''
  }
  <div class="footer">Gracias por su compra</div>
</body>
</html>`;
  }

  private escapar(valor: string): string {
    const div = document.createElement('div');
    div.textContent = valor;
    return div.innerHTML;
  }
}
