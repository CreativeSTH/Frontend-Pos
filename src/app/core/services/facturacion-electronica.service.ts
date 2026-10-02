import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  DatosNegocioPayload,
  DetalleFactura,
  DocumentoElectronico,
  FiltrosFacturas,
  HabilitacionFacturacionElectronica,
  ListadoFacturas,
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

  listarFacturas(filtros: FiltrosFacturas) {
    return this.api.get<ListadoFacturas>('/facturacion-electronica/facturas', { ...filtros });
  }

  obtenerFactura(id: string) {
    return this.api.get<DetalleFactura>(`/facturacion-electronica/facturas/${id}`);
  }

  /** Fase 7: envía (o reenvía) la factura aceptada; `correo` reemplaza el del cliente solo para este envío. */
  enviarCorreoFactura(id: string, correo?: string) {
    return this.api.post<DocumentoElectronico>(`/facturacion-electronica/facturas/${id}/enviar-correo`, correo ? { correo } : {});
  }

  reintentarFactura(id: string) {
    return this.api.post<DocumentoElectronico>(`/facturacion-electronica/facturas/${id}/reintentar`, {});
  }

  /** PDF generado por AURA (Alegra no genera PDF) — como Blob, para mostrarlo en un visor con el JWT. */
  descargarPdf(id: string) {
    return this.api.getBlob(`/facturacion-electronica/facturas/${id}/pdf`);
  }

  descargarXml(id: string) {
    return this.api.getBlob(`/facturacion-electronica/facturas/${id}/xml`);
  }
}
