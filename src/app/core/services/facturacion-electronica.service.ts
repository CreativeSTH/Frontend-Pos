import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  DatosNegocioPayload,
  DocumentoElectronico,
  HabilitacionFacturacionElectronica,
  ResolucionPayload,
} from '../models/facturacion-electronica.model';

@Injectable({ providedIn: 'root' })
export class FacturacionElectronicaService {
  private readonly api = inject(ApiService);

  miHabilitacion() {
    return this.api.get<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion');
  }

  actualizarDatosNegocio(payload: DatosNegocioPayload) {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/datos-negocio', payload);
  }

  confirmarTramiteDian() {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/confirmar-tramite-dian', {});
  }

  cargarResolucion(payload: ResolucionPayload) {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/resolucion', payload);
  }

  confirmarTestSet() {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/testset', {});
  }

  activarModoSandboxDePrueba(payload: DatosNegocioPayload) {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/sandbox-de-prueba', payload);
  }

  volverAModoReal() {
    return this.api.post<HabilitacionFacturacionElectronica>('/facturacion-electronica/habilitacion/volver-a-real', {});
  }

  miDocumento(ventaId: string) {
    return this.api.get<DocumentoElectronico | null>(`/facturacion-electronica/documentos/${ventaId}`);
  }

  reintentar(ventaId: string) {
    return this.api.post<DocumentoElectronico>(`/facturacion-electronica/documentos/${ventaId}/reintentar`, {});
  }

  obtenerLinksDescarga(ventaId: string) {
    return this.api.get<{ urlXml?: string; urlPdf?: string }>(`/facturacion-electronica/documentos/${ventaId}/descargar`);
  }
}
