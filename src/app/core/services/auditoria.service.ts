import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { FiltrosAuditoria, PaginaAuditoria } from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly api = inject(ApiService);

  consultar(filtros: FiltrosAuditoria) {
    return this.api.get<PaginaAuditoria>('/auditoria', { ...filtros });
  }

  historial(entidad: string, entidadId: string, pagina = 1, porPagina = 20) {
    return this.api.get<PaginaAuditoria>(`/auditoria/entidad/${entidad}/${entidadId}`, { pagina, porPagina });
  }

  usuarios() {
    return this.api.get<{ id: string; nombre: string }[]>('/auditoria/usuarios');
  }
}
