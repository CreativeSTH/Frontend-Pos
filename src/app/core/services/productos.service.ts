import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CreateProductoPayload, Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Producto[]>('/productos');
  }

  findOne(id: string) {
    return this.api.get<Producto>(`/productos/${id}`);
  }

  buscarPorCodigoBarras(codigo: string) {
    return this.api.get<Producto>(`/productos/codigo-barras/${codigo}`);
  }

  create(payload: CreateProductoPayload, imagen?: File | null) {
    return this.api.post<Producto>('/productos', this.toFormData(payload, imagen));
  }

  update(id: string, payload: Partial<CreateProductoPayload>, imagen?: File | null) {
    return this.api.patch<Producto>(`/productos/${id}`, this.toFormData(payload, imagen));
  }

  remove(id: string) {
    return this.api.delete<void>(`/productos/${id}`);
  }

  private toFormData(payload: object, imagen?: File | null): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    if (imagen) {
      formData.append('imagen', imagen);
    }
    return formData;
  }
}
