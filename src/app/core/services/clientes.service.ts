import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Cliente, CreateClientePayload, VerificarCreditoResponse } from '../models/cliente.model';
import { CreateDireccionClientePayload, DireccionCliente } from '../models/direccion-cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly api = inject(ApiService);

  findAll() {
    return this.api.get<Cliente[]>('/clientes');
  }

  findOne(id: string) {
    return this.api.get<Cliente>(`/clientes/${id}`);
  }

  create(payload: CreateClientePayload) {
    return this.api.post<Cliente>('/clientes', payload);
  }

  update(id: string, payload: Partial<CreateClientePayload>) {
    return this.api.patch<Cliente>(`/clientes/${id}`, payload);
  }

  verificarCredito(id: string, monto: number) {
    return this.api.get<VerificarCreditoResponse>(`/clientes/${id}/credito`, { monto });
  }

  bloquear(id: string, motivo: string) {
    return this.api.post<Cliente>(`/clientes/${id}/bloquear`, { motivo });
  }

  desbloquear(id: string) {
    return this.api.post<Cliente>(`/clientes/${id}/desbloquear`, {});
  }

  direcciones(clienteId: string) {
    return this.api.get<DireccionCliente[]>(`/clientes/${clienteId}/direcciones`);
  }

  agregarDireccion(clienteId: string, payload: CreateDireccionClientePayload) {
    return this.api.post<DireccionCliente>(`/clientes/${clienteId}/direcciones`, payload);
  }

  actualizarDireccion(
    clienteId: string,
    direccionId: string,
    payload: Partial<CreateDireccionClientePayload>,
  ) {
    return this.api.patch<DireccionCliente>(
      `/clientes/${clienteId}/direcciones/${direccionId}`,
      payload,
    );
  }

  eliminarDireccion(clienteId: string, direccionId: string) {
    return this.api.delete<void>(`/clientes/${clienteId}/direcciones/${direccionId}`);
  }
}
