import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DeclaracionPerfilFiscal, EstadoFacturacion } from '../models/politica-facturacion.model';

/**
 * Estado de la política de facturación del negocio en un signal compartido: lo leen el banner,
 * el modal de perfil fiscal y (fase 2) el POS. Se carga una vez desde el `dashboard-layout`.
 */
@Injectable({ providedIn: 'root' })
export class PoliticaFacturacionService {
  private readonly api = inject(ApiService);
  private readonly _estado = signal<EstadoFacturacion | null>(null);
  readonly estado = this._estado.asReadonly();

  /** Al pasar a un usuario de tier SISTEMA (p. ej. "Salir" del modo soporte) — no pertenece a un negocio. */
  limpiar(): void {
    this._estado.set(null);
  }

  cargar(): void {
    this.api.get<EstadoFacturacion>('/politica-facturacion/estado').subscribe({
      next: (estado) => this._estado.set(estado),
      error: () => {}, // silencioso, mismo criterio que los banners: no ensuciar la consola en cada navegación
    });
  }

  declararPerfil(payload: DeclaracionPerfilFiscal): Observable<EstadoFacturacion> {
    return this.api
      .patch<EstadoFacturacion>('/politica-facturacion/perfil-fiscal', payload)
      .pipe(tap((estado) => this._estado.set(estado)));
  }
}
