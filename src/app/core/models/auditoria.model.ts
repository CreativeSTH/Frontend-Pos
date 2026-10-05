import { ModuloPermiso } from './auth.model';

export type AccionAuditoria =
  | 'CREAR'
  | 'EDITAR'
  | 'DESACTIVAR'
  | 'REACTIVAR'
  | 'ELIMINAR'
  | 'ANULAR'
  | 'ABRIR'
  | 'CERRAR'
  | 'AJUSTAR'
  | 'EMITIR'
  | 'CANCELAR'
  | 'REGISTRAR'
  | 'CAMBIAR_PERMISOS';

export type OrigenAuditoria = 'USUARIO' | 'SISTEMA' | 'WEBHOOK' | 'TIENDA_ONLINE';

export interface CambioAuditoria {
  campo: string;
  etiqueta: string;
  antes: string | null;
  despues: string | null;
}

export interface RegistroAuditoria {
  id: string;
  createdAt: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  origen: OrigenAuditoria;
  sucursalId: string | null;
  modulo: ModuloPermiso;
  entidad: string;
  entidadId: string;
  entidadEtiqueta: string;
  accion: AccionAuditoria;
  descripcion: string;
  cambios: CambioAuditoria[] | null;
}

export interface PaginaAuditoria {
  items: RegistroAuditoria[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  usuarioId?: string;
  modulo?: ModuloPermiso;
  accion?: AccionAuditoria;
  buscar?: string;
  pagina?: number;
  porPagina?: number;
}
