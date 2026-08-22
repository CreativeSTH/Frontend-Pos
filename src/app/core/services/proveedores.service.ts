import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CreateProveedorPayload,
  ProductoProveedor,
  Proveedor,
  ProveedorDocumentos,
  VincularProveedorPayload,
} from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Proveedor[]>('/proveedores');
  }

  findOne(id: string) {
    return this.api.get<Proveedor>(`/proveedores/${id}`);
  }

  create(payload: CreateProveedorPayload, documentos?: ProveedorDocumentos) {
    return this.api.post<Proveedor>('/proveedores', this.toFormData(payload, documentos));
  }

  update(id: string, payload: Partial<CreateProveedorPayload>, documentos?: ProveedorDocumentos) {
    return this.api.patch<Proveedor>(`/proveedores/${id}`, this.toFormData(payload, documentos));
  }

  remove(id: string) {
    return this.api.delete<void>(`/proveedores/${id}`);
  }

  porProducto(productoId: string) {
    return this.api.get<ProductoProveedor[]>(`/proveedores/producto/${productoId}`);
  }

  vincularProducto(productoId: string, payload: VincularProveedorPayload) {
    return this.api.post<ProductoProveedor>(`/proveedores/producto/${productoId}`, payload);
  }

  desvincularProducto(productoId: string, proveedorId: string) {
    return this.api.delete<void>(`/proveedores/producto/${productoId}/${proveedorId}`);
  }

  private toFormData(payload: object, documentos?: ProveedorDocumentos): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    }
    if (documentos?.rutDocumento) formData.append('rutDocumento', documentos.rutDocumento);
    if (documentos?.camaraComercioDocumento) {
      formData.append('camaraComercioDocumento', documentos.camaraComercioDocumento);
    }
    if (documentos?.certificacionBancariaDocumento) {
      formData.append('certificacionBancariaDocumento', documentos.certificacionBancariaDocumento);
    }
    return formData;
  }
}
