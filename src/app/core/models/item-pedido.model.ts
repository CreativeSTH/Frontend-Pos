export type EstadoItemPedido = 'PENDIENTE' | 'PEDIDO' | 'INGRESADO';

export interface ItemPedido {
  id: string;
  negocioId: string;
  productoId: string;
  nombreProducto: string;
  estado: EstadoItemPedido;
  proveedorId?: string;
  nombreProveedor?: string;
  costoUnitario?: number;
  cantidad?: number;
  fechaPedido?: string;
  fechaIngreso?: string;
  agregadoPor?: string;
  pedidoPor?: string;
  ingresadoPor?: string;
  createdAt: string;
}

export interface RealizarPedidoPayload {
  proveedorId?: string;
  proveedorNuevo?: { nombre: string };
  costoUnitario: number;
  cantidad: number;
}

export interface ConfirmarIngresoPayload {
  bodegaId: string;
  nuevoPrecioVenta?: number;
}
