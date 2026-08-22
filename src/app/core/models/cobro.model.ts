export interface CobroItem {
  ventaId: string;
  clienteId: string | null;
  nombreCliente: string;
  telefonoCliente: string | null;
  cuota: {
    numero: number;
    monto: number;
    fechaVencimiento: string;
    saldoPendiente: number;
    diasMora: number;
    montoMora: number;
    montoTotalConMora: number;
  };
}

export interface CobrosTotales {
  totalPendiente: number;
  totalVencido: number;
  totalMora: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  clientesConDeuda: number;
}
