import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EstadoContingencia, PeriodoContingencia, ResolucionContingenciaPayload } from '../models/contingencia.model';
import { DocumentoElectronico } from '../models/facturacion-electronica.model';

const BASE = '/facturacion-electronica/contingencia';

/** Contingencia de facturación (fase 6a): resolución de papel, períodos, carta a la DIAN y sus facturas. */
@Injectable({ providedIn: 'root' })
export class ContingenciaService {
  private readonly api = inject(ApiService);

  estado() {
    return this.api.get<EstadoContingencia>(BASE);
  }

  cargarResolucion(payload: ResolucionContingenciaPayload) {
    return this.api.post<EstadoContingencia>(`${BASE}/resolucion`, payload);
  }

  declarar(payload: { motivo: string; inicio?: string }) {
    return this.api.post<PeriodoContingencia>(`${BASE}/declarar`, payload);
  }

  finalizar(payload: { fin?: string } = {}) {
    return this.api.post<PeriodoContingencia>(`${BASE}/finalizar`, payload);
  }

  marcarAviso(periodoId: string, tipo: 'INICIO' | 'FIN') {
    return this.api.post<PeriodoContingencia>(`${BASE}/periodos/${periodoId}/aviso`, { tipo });
  }

  /** Carta de aviso a la DIAN en PDF, como Blob (la descarga lleva el JWT). */
  carta(periodoId: string, tipo: 'INICIO' | 'FIN') {
    return this.api.getBlob(`${BASE}/periodos/${periodoId}/carta?tipo=${tipo}`);
  }

  documentos(periodoId?: string) {
    return this.api.get<DocumentoElectronico[]>(`${BASE}/documentos${periodoId ? `?periodoId=${periodoId}` : ''}`);
  }
}
