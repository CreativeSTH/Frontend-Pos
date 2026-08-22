import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface InventarioItem {
  id: string;
  productoId: string;
  bodegaId: string;
  cantidad: number;
  stockMinimo: number;
  producto?: { nombre: string; codigoBarras?: string; imagenUrl?: string };
  bodega?: { nombre: string };
}

export type TipoAjusteInventario = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export type TipoMovimientoInventario = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'DEVOLUCION';

export interface MovimientoInventario {
  id: string;
  productoId: string;
  bodegaId: string;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  motivo?: string;
  ventaId?: string;
  createdAt: string;
  producto?: { nombre: string };
  bodega?: { nombre: string };
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly api = inject(ApiService);

  findAll(bodegaId?: string) {
    return this.api.get<InventarioItem[]>('/inventario', { bodegaId });
  }

  bajoStock() {
    return this.api.get<InventarioItem[]>('/inventario/bajo-stock');
  }

  kardex(filtros: {
    productoId?: string;
    bodegaId?: string;
    desde?: string;
    hasta?: string;
    [key: string]: string | undefined;
  }) {
    return this.api.get<MovimientoInventario[]>('/inventario/kardex', filtros);
  }

  ajustar(payload: {
    productoId: string;
    bodegaId: string;
    tipo: TipoAjusteInventario;
    cantidad: number;
    motivo?: string;
  }) {
    return this.api.post<InventarioItem>('/inventario/ajustar', payload);
  }

  setStockMinimo(productoId: string, bodegaId: string, stockMinimo: number) {
    return this.api.patch<InventarioItem>('/inventario/stock-minimo', { productoId, bodegaId, stockMinimo });
  }
}
