export interface ItemPedido {
  id: string;
  negocioId: string;
  productoId: string;
  nombreProducto: string;
  comprado: boolean;
  agregadoPor?: string;
  createdAt: string;
}
