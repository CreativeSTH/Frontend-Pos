import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CrearDevolucionBody, Devolucion, Devolvible } from '../models/devolucion.model';
import { ReciboContenido } from '../models/recibo-contenido.model';

@Injectable({ providedIn: 'root' })
export class DevolucionesService {
  private readonly api = inject(ApiService);

  /** Qué se puede devolver de una venta, con qué reembolsos, y si hay un bloqueo (p. ej. factura en validación DIAN). */
  devolvible(ventaId: string) {
    return this.api.get<Devolvible>(`/ventas/${ventaId}/devolvible`);
  }

  crear(body: CrearDevolucionBody) {
    return this.api.post<Devolucion>('/devoluciones', body);
  }

  listar(filtros: { desde?: string; hasta?: string; pagina?: number; porPagina?: number } = {}) {
    return this.api.get<{ items: Devolucion[]; total: number; pagina: number; porPagina: number }>('/devoluciones', filtros);
  }

  /** Mismo `ReciboContenido` que el comprobante de una venta, con `tipo: 'DEVOLUCION'`. */
  comprobante(id: string) {
    return this.api.get<ReciboContenido>(`/devoluciones/${id}/comprobante`);
  }
}
