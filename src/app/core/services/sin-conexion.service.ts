import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AgenteSinConexionService } from './agente-sin-conexion.service';
import { ConexionService } from './conexion.service';
import { PrintAgentService, versionAlMenos } from './print-agent.service';
import { ToastService } from './toast.service';
import {
  BloqueNumeracion, DatosSinConexion, EstadoAgenteSinConexion, ResultadoSincronizacion, SnapshotPos,
} from '../models/sin-conexion.model';

export const MINIMO_ANTES_DE_RENOVAR = 10;
export const VERSION_MINIMA_SIN_CONEXION = '1.4.0';
const LOTE = 20;

/**
 * Vender sin internet (fase 6b): mantiene la foto del POS y el bloque de numeración en el pos-agent
 * mientras hay conexión, abre/cierra el episodio sin conexión y, al volver, sincroniza la cola.
 */
@Injectable({ providedIn: 'root' })
export class SinConexionService {
  private readonly api = inject(ApiService);
  private readonly agente = inject(AgenteSinConexionService);
  private readonly conexion = inject(ConexionService);
  private readonly printAgent = inject(PrintAgentService);
  private readonly toast = inject(ToastService);

  readonly agenteListo = signal(false);
  readonly estadoAgente = signal<EstadoAgenteSinConexion | null>(null);
  readonly sincronizando = signal(false);
  readonly datos = signal<DatosSinConexion | null>(null);
  readonly ultimaFoto = signal<SnapshotPos | null>(null);

  constructor() {
    this.refrescarEstado();
    let estabaEnLinea = this.conexion.enLinea();
    effect(() => {
      const enLinea = this.conexion.enLinea();
      if (enLinea === estabaEnLinea) return;
      estabaEnLinea = enLinea;
      if (!enLinea) {
        this.agente.abrirEpisodio().subscribe({ error: () => undefined });
      } else {
        void this.alVolverLaConexion();
      }
    });
  }

  refrescarEstado(): void {
    this.printAgent.estado().subscribe((s) => {
      const listo = s.ok && versionAlMenos(s.version, VERSION_MINIMA_SIN_CONEXION);
      this.agenteListo.set(listo);
      if (!listo) return;
      this.agente.estado().subscribe({
        next: (e) => {
          this.estadoAgente.set(e);
          // Al abrir el POS después de una caída (página nueva, sin transición "sin conexión → en línea"),
          // se cierra el episodio y se sincroniza — solo si el backend responde de verdad.
          if ((e.episodioAbierto || e.pendientes > 0) && this.conexion.enLinea() && !this.sincronizando()) {
            void this.conexion.verificar().then((enLinea) => (enLinea ? this.alVolverLaConexion() : undefined));
          }
        },
        error: () => this.estadoAgente.set(null),
      });
    });
  }

  /**
   * Con conexión: guarda la foto (con los datos del emisor) y renueva el bloque si quedan pocos números.
   * Consulta primero al agente: en la primera carga del POS su estado todavía no llegó.
   */
  prepararse(foto: Omit<SnapshotPos, 'datos'>): void {
    void this.prepararseAsync(foto);
  }

  private async prepararseAsync(foto: Omit<SnapshotPos, 'datos'>): Promise<void> {
    if (!this.conexion.enLinea()) return;
    try {
      const agente = await firstValueFrom(this.printAgent.estado());
      const listo = agente.ok && versionAlMenos(agente.version, VERSION_MINIMA_SIN_CONEXION);
      this.agenteListo.set(listo);
      if (!listo) return;
      const estado = await firstValueFrom(this.agente.estado());
      this.estadoAgente.set(estado);
      const datos = await firstValueFrom(this.api.get<DatosSinConexion>('/ventas/sin-conexion/datos'));
      this.datos.set(datos);
      this.ultimaFoto.set({ ...foto, datos });
      await firstValueFrom(this.agente.guardarSnapshot({ ...foto, datos }));
      const debeRenovar =
        foto.estadoFacturacion?.modo === 'ELECTRONICA' && !!datos.resolucion && estado.disponibles < MINIMO_ANTES_DE_RENOVAR;
      if (debeRenovar) {
        const bloque = await firstValueFrom(
          this.api.post<BloqueNumeracion>('/ventas/sin-conexion/reservas', { terminalId: estado.terminalId }),
        );
        this.estadoAgente.set(await firstValueFrom(this.agente.guardarBloque(bloque)));
      }
    } catch {
      // Sin agente o sin backend: se reintenta en la próxima carga o venta en línea.
    }
  }

  private async alVolverLaConexion(): Promise<void> {
    await firstValueFrom(this.agente.cerrarEpisodio()).catch(() => null);
    await this.sincronizar();
  }

  /** Manda la cola al backend en lotes; lo que falla queda pendiente con su mensaje. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando() || !this.agenteListo() || !this.conexion.enLinea()) return;
    this.sincronizando.set(true);
    try {
      const { episodios, ventas } = await firstValueFrom(this.agente.pendientes());
      let ok = 0;
      let errores = 0;
      for (let i = 0; i < ventas.length; i += LOTE) {
        const lote = ventas.slice(i, i + LOTE);
        const resultados = await firstValueFrom(
          this.api.post<ResultadoSincronizacion[]>('/ventas/sin-conexion/sincronizar', {
            episodios: episodios.filter((e) => lote.some((v) => v.asignacion.episodioId === e.id)),
            ventas: lote.map((v) => ({
              idLocal: v.idLocal,
              episodioId: v.asignacion.episodioId,
              creadaEn: v.creadaEn,
              turnoId: v.turnoId,
              sucursalId: v.sucursalId,
              bodegaId: v.bodegaId,
              tipoVenta: v.tipoVenta,
              clienteId: v.clienteId,
              nombreCliente: v.nombreCliente,
              items: v.items,
              pagos: v.pagos,
              numeroCuotas: v.numeroCuotas,
              fechaPrimerPago: v.fechaPrimerPago,
              comprobante: v.asignacion.numero
                ? { tipo: 'CONTINGENCIA', numero: v.asignacion.numero, resolucion: v.asignacion.resolucion, numeroImpreso: `${v.asignacion.prefijo}${v.asignacion.numero}` }
                : { tipo: 'RECIBO_PROVISIONAL', numeroImpreso: v.asignacion.numeroProvisional },
            })),
          }),
        );
        ok += resultados.filter((r) => r.estado !== 'ERROR').length;
        errores += resultados.filter((r) => r.estado === 'ERROR').length;
        this.estadoAgente.set(await firstValueFrom(this.agente.confirmar(resultados)));
      }
      if (ok) this.toast.success(`${ok} venta(s) hechas sin conexión quedaron registradas`);
      if (errores) this.toast.error(`${errores} venta(s) sin conexión no se pudieron registrar — revísalas en el punto de venta`);
    } catch {
      // Se reintenta en la próxima reconexión o al abrir el POS.
    } finally {
      this.sincronizando.set(false);
    }
  }
}

