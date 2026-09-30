import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AsignacionSinConexion, BloqueNumeracion, DatosVentaSinConexion, EstadoAgenteSinConexion,
  ResultadoSincronizacion, SnapshotPos, VentaPendiente,
} from '../models/sin-conexion.model';

const BASE = `${environment.agentUrl}/sin-conexion`;

/** El almacén sin conexión del pos-agent de esta PC (fase 6b). */
@Injectable({ providedIn: 'root' })
export class AgenteSinConexionService {
  private readonly http = inject(HttpClient);

  estado() { return this.http.get<EstadoAgenteSinConexion>(`${BASE}/estado`); }
  guardarSnapshot(s: SnapshotPos) { return this.http.post<{ ok: true }>(`${BASE}/snapshot`, s); }
  leerSnapshot() { return this.http.get<SnapshotPos>(`${BASE}/snapshot`); }
  guardarBloque(b: BloqueNumeracion) { return this.http.post<EstadoAgenteSinConexion>(`${BASE}/bloque`, b); }
  abrirEpisodio() { return this.http.post<{ id: string; inicio: string }>(`${BASE}/episodios/abrir`, { ahora: new Date().toISOString() }); }
  cerrarEpisodio() { return this.http.post<{ id: string; inicio: string; fin: string } | null>(`${BASE}/episodios/cerrar`, { ahora: new Date().toISOString() }); }
  registrarVenta(req: { idLocal: string; requiereNumero: boolean; datos: DatosVentaSinConexion }) {
    return this.http.post<AsignacionSinConexion>(`${BASE}/ventas`, req);
  }
  pendientes() { return this.http.get<{ episodios: { id: string; inicio: string; fin: string }[]; ventas: VentaPendiente[] }>(`${BASE}/pendientes`); }
  confirmar(resultados: ResultadoSincronizacion[]) { return this.http.post<EstadoAgenteSinConexion>(`${BASE}/confirmar`, { resultados }); }
}
