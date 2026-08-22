import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ReporteVentas, ReporteMargenes, ReporteCierresCaja } from '../models/reporte.model';

export interface ReportesFiltro {
  desde?: string;
  hasta?: string;
  sucursalId?: string;
  [key: string]: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  ventas(filtros: ReportesFiltro) {
    return this.api.get<ReporteVentas>('/reportes/ventas', filtros);
  }

  margenes(filtros: ReportesFiltro) {
    return this.api.get<ReporteMargenes>('/reportes/margenes', filtros);
  }

  cierresCaja(filtros: ReportesFiltro) {
    return this.api.get<ReporteCierresCaja>('/reportes/cierres-caja', filtros);
  }
}
