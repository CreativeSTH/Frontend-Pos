import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReciboContenido } from '../models/recibo-contenido.model';

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
  /** Ancho físico del papel en mm — determina cuántos caracteres por línea entran y el ancho máximo del logo. Default en pos-agent: 58. */
  paperWidth?: 58 | 80;
}

/** Opciones que solo existen en el momento de la venta original — no se pueden reconstruir en una reimpresión. */
export interface OpcionesImpresion {
  abrirCajon?: boolean;
  /** Vuelto entregado — solo disponible justo después de cobrar, nunca se persiste. */
  cambio?: number;
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
   * `contenido` es el mismo objeto que devuelve `GET /ventas/:id/comprobante`
   * — este método (y `imprimirReciboNavegador`) son renderers puros de él,
   * no reconstruyen nada por su cuenta.
   */
  imprimirTicket(contenido: ReciboContenido, opciones: OpcionesImpresion = {}): Observable<PrintResult> {
    // Se consulta el ancho de papel configurado ANTES de tocar el logo — pos-agent es la fuente de
    // verdad de qué impresora hay conectada a esta PC (ver Configuración > Dispositivos), y el
    // ancho máximo del logo depende de eso (384pt en 58mm, 576pt en 80mm).
    return this.obtenerConfig().pipe(
      switchMap((config) => this.obtenerLogoBase64(contenido.negocio.logoUrl, config.paperWidth)),
      switchMap((logoBase64) => {
        const payload = {
          tipo: contenido.tipo,
          negocio: {
            nombre: contenido.negocio.nombre,
            nit: contenido.negocio.nit,
            logoBase64,
          },
          venta: {
            numero: contenido.numero,
            fecha: contenido.fecha,
            cliente: contenido.cliente,
            emisor: contenido.emisor,
            items: contenido.items,
            subtotal: contenido.subtotal,
            descuento: contenido.descuento,
            impuesto: contenido.impuesto,
            total: contenido.total,
            pagos: contenido.pagos,
            cambio: opciones.cambio,
            mensajeCierre: contenido.mensajeCierre,
            terminos: contenido.terminos,
            dian: contenido.dian,
          },
          abrirCajon: opciones.abrirCajon ?? true,
        };
        return this.http
          .post<PrintResult>(`${environment.agentUrl}/print`, payload)
          .pipe(catchError(() => of<PrintResult>({ impreso: false, error: 'Agente de impresión no disponible' })));
      }),
    );
  }

  /**
   * Ancho de papel (mm) → ancho máximo de imagen en puntos que el cabezal puede imprimir en una
   * línea (58mm a 203dpi ≈ 384 puntos; 80mm ≈ 576 — mismos 2 valores que usa `pos-agent` del lado
   * del texto, ver `printer.js::PUNTOS_POR_ANCHO`; no hay forma de compartir la tabla entre ambos
   * runtimes, así que queda duplicada a propósito, mismo criterio que el resto del proyecto usa
   * para constantes chicas que cruzan repos). Sin este tope, un logo subido a resolución normal
   * (ej. 400×110, ya confirmado real en un negocio de prueba) hace que `pos-agent` mande a la
   * impresora un comando ESC/POS de imagen más ancho de lo que el cabezal puede imprimir en una
   * línea — el firmware de la impresora no lo rechaza, sigue leyendo los bytes "sobrantes" del
   * comando como si fueran texto normal, y eso es lo que sale como números/letras sueltas en vez
   * del logo (bug real diagnosticado, no una sospecha).
   */
  private readonly LOGO_ANCHO_MAXIMO_PX: Record<58 | 80, number> = { 58: 384, 80: 576 };

  /**
   * Descarga el logo como blob y lo redimensiona/normaliza para impresión
   * térmica — pos-agent no tiene acceso propio al backend, así que este
   * downscale tiene que pasar por acá antes de mandarlo. Reescalar el ANCHO
   * es lo que corrige el bug de arriba; convertir a PNG real de paso también
   * cierra un problema latente: el formulario de logo acepta JPG/WEBP
   * además de PNG (`upload.config.ts`), pero `node-thermal-printer` en
   * pos-agent solo sabe decodificar PNG (`PNG.sync.read`) — un logo subido
   * en otro formato fallaba en silencio (se loguea el error y se imprime sin
   * logo). No se convierte a escala de grises acá: `node-thermal-printer` ya
   * binariza pixel por pixel con la fórmula de luminancia estándar antes de
   * mandarlo a la impresora (confirmado leyendo su código fuente), así que
   * hacerlo dos veces sería redundante.
   */
  private obtenerLogoBase64(logoUrl: string | undefined, paperWidth: 58 | 80 | undefined): Observable<string | undefined> {
    if (!logoUrl) return of(undefined);
    return this.http.get(`${environment.assetsUrl}${logoUrl}`, { responseType: 'blob' }).pipe(
      switchMap((blob) => from(this.redimensionarLogoParaImpresora(blob, this.LOGO_ANCHO_MAXIMO_PX[paperWidth ?? 58]))),
      // Si falla la descarga o el redimensionado del logo, se imprime igual sin él — no debe bloquear la venta.
      catchError(() => of(undefined)),
    );
  }

  private redimensionarLogoParaImpresora(blob: Blob, anchoMaximoPx: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const anchoOriginal = img.naturalWidth;
          const altoOriginal = img.naturalHeight;
          if (!anchoOriginal || !altoOriginal) {
            reject(new Error('El logo no tiene dimensiones válidas'));
            return;
          }
          const ancho = Math.min(anchoOriginal, anchoMaximoPx);
          const alto = Math.max(1, Math.round(altoOriginal * (ancho / anchoOriginal)));

          const canvas = document.createElement('canvas');
          canvas.width = ancho;
          canvas.height = alto;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo redimensionar el logo'));
            return;
          }
          ctx.drawImage(img, 0, 0, ancho, alto);
          resolve(canvas.toDataURL('image/png').split(',')[1] ?? '');
        } catch (err) {
          reject(err instanceof Error ? err : new Error('No se pudo redimensionar el logo'));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer el logo'));
      };
      img.src = url;
    });
  }

  /**
   * Fallback cuando el pos-agent no está disponible (o el negocio nunca lo
   * instaló): abre una ventana aparte con el recibo listo para imprimir
   * desde el navegador. No depende de Angular ni de estilos de la app —
   * intencionalmente HTML plano, para que salga limpio en cualquier
   * impresora sin arrastrar el sidebar/fondo de la SPA.
   */
  imprimirReciboNavegador(contenido: ReciboContenido, opciones: OpcionesImpresion = {}): boolean {
    const ventana = window.open('', '_blank', 'width=380,height=600');
    if (!ventana) return false;
    ventana.document.write(this.construirHtmlRecibo(contenido, opciones));
    ventana.document.close();
    ventana.focus();
    ventana.onload = () => ventana.print();
    return true;
  }

  private construirHtmlRecibo(contenido: ReciboContenido, opciones: OpcionesImpresion): string {
    const money = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
    const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(contenido.fecha),
    );

    const filasItems = contenido.items
      .map(
        (item) => `
          <tr>
            <td>${this.escapar(item.nombre)}</td>
            <td class="num">${item.cantidad}</td>
            <td class="num">${money(item.subtotal)}</td>
          </tr>
          <tr class="iva-linea">
            <td colspan="3">IVA (${money(item.impuesto)} sobre ${money(item.baseImponible)})</td>
          </tr>`,
      )
      .join('');

    const filasPagos = contenido.pagos
      .map(
        (pago) => `
          <tr>
            <td>${this.escapar(pago.metodo)}</td>
            <td class="num">${money(pago.monto)}</td>
          </tr>`,
      )
      .join('');

    const dianHtml =
      contenido.tipo === 'FACTURA' && contenido.dian
        ? `<hr /><div class="dian">
            ${contenido.dian.resolucionNumero ? `<div>Resolución DIAN No. ${this.escapar(contenido.dian.resolucionNumero)}</div>` : ''}
            ${
              contenido.dian.prefijo || contenido.dian.rangoDesde || contenido.dian.rangoHasta
                ? `<div>Numeración: ${this.escapar(contenido.dian.prefijo ?? '')}${contenido.dian.rangoDesde ?? ''} - ${this.escapar(contenido.dian.prefijo ?? '')}${contenido.dian.rangoHasta ?? ''}</div>`
                : ''
            }
            ${contenido.dian.fechaVigencia ? `<div>Vigente hasta: ${this.escapar(contenido.dian.fechaVigencia)}</div>` : ''}
            ${contenido.dian.regimenFiscal ? `<div>Régimen: ${this.escapar(contenido.dian.regimenFiscal)}</div>` : ''}
            ${(contenido.dian.camposExtra ?? []).map((c) => `<div>${this.escapar(c.etiqueta)}: ${this.escapar(c.valor)}</div>`).join('')}
          </div>`
        : '';

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${contenido.tipo === 'FACTURA' ? 'Factura' : 'Recibo'} ${this.escapar(contenido.numero)}</title>
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
  .logo { display: block; max-width: 100%; max-height: 80px; margin: 0 auto 8px; }
  .meta { text-align: center; font-size: 11px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 2px 0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .totales td { padding: 1px 0; }
  .totales .label { color: #333; }
  .total-final td { font-weight: bold; font-size: 14px; padding-top: 4px; }
  .footer { text-align: center; margin-top: 16px; font-size: 11px; }
  .terminos { text-align: center; margin-top: 8px; font-size: 10px; color: #333; }
  .dian { text-align: center; font-size: 9px; color: #333; }
  .iva-linea td { font-size: 10px; color: #555; padding-top: 0; padding-bottom: 4px; }
</style>
</head>
<body>
  ${contenido.negocio.logoUrl ? `<img class="logo" src="${environment.assetsUrl}${contenido.negocio.logoUrl}" alt="Logo" />` : ''}
  <h1>${this.escapar(contenido.tipo === 'FACTURA' ? 'FACTURA DE VENTA' : contenido.negocio.nombre || 'Recibo de venta')}</h1>
  ${contenido.tipo === 'FACTURA' ? `<div class="meta">${this.escapar(contenido.negocio.nombre)}</div>` : ''}
  ${contenido.negocio.nit ? `<div class="meta">NIT: ${this.escapar(contenido.negocio.nit)}</div>` : ''}
  ${contenido.emisor.nombrePersonaNatural ? `<div class="meta">${this.escapar(contenido.emisor.nombrePersonaNatural)}</div>` : ''}
  ${contenido.emisor.direccion ? `<div class="meta">${this.escapar(contenido.emisor.direccion)}</div>` : ''}
  ${contenido.emisor.telefono ? `<div class="meta">Tel: ${this.escapar(contenido.emisor.telefono)}</div>` : ''}
  <div class="meta">No. ${this.escapar(contenido.numero)} · ${fecha}<br />${this.escapar(contenido.cliente)}</div>
  <hr />
  <table>
    <thead>
      <tr><td>Producto</td><td class="num">Cant.</td><td class="num">Subtotal</td></tr>
    </thead>
    <tbody>${filasItems}</tbody>
  </table>
  <hr />
  <table class="totales">
    <tr><td class="label">Subtotal</td><td class="num">${money(contenido.subtotal)}</td></tr>
    ${contenido.descuento > 0 ? `<tr><td class="label">Descuento</td><td class="num">-${money(contenido.descuento)}</td></tr>` : ''}
    <tr><td class="label">IVA</td><td class="num">${money(contenido.impuesto)}</td></tr>
    <tr class="total-final"><td>Total</td><td class="num">${money(contenido.total)}</td></tr>
  </table>
  ${filasPagos ? `<hr /><table>${filasPagos}</table>` : ''}
  ${opciones.cambio ? `<div class="meta">Cambio: ${money(opciones.cambio)}</div>` : ''}
  <div class="footer">${this.escapar(contenido.mensajeCierre || 'Gracias por su compra')}</div>
  ${contenido.terminos ? `<div class="terminos">${this.escapar(contenido.terminos)}</div>` : ''}
  ${dianHtml}
</body>
</html>`;
  }

  private escapar(valor: string | undefined): string {
    if (!valor) return '';
    const div = document.createElement('div');
    div.textContent = valor;
    return div.innerHTML;
  }
}
