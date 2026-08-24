import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  ConfiguracionGrafico,
  FuenteDatoCatalogoItem,
  GraficoConfigurado,
  LayoutGraficos,
  PaginaLayoutGraficos,
  SerieResultado,
  TipoGrafico,
  WidgetLayoutGrafico,
} from '../models/grafico.model';

export interface GraficoPayload {
  nombre: string;
  tipo: TipoGrafico;
  configuracion: ConfiguracionGrafico;
}

@Injectable({ providedIn: 'root' })
export class GraficosService {
  private readonly api = inject(ApiService);

  fuentes() {
    return this.api.get<FuenteDatoCatalogoItem[]>('/graficos/fuentes');
  }

  preview(configuracion: ConfiguracionGrafico) {
    return this.api.post<SerieResultado[]>('/graficos/preview', configuracion);
  }

  findAll() {
    return this.api.get<GraficoConfigurado[]>('/graficos');
  }

  findOne(id: string) {
    return this.api.get<GraficoConfigurado>(`/graficos/${id}`);
  }

  datos(id: string, desde?: string, hasta?: string) {
    return this.api.get<SerieResultado[]>(`/graficos/${id}/datos`, { desde, hasta });
  }

  create(payload: GraficoPayload) {
    return this.api.post<GraficoConfigurado>('/graficos', payload);
  }

  update(id: string, payload: Partial<GraficoPayload>) {
    return this.api.patch<GraficoConfigurado>(`/graficos/${id}`, payload);
  }

  remove(id: string) {
    return this.api.delete<void>(`/graficos/${id}`);
  }

  obtenerLayout(pagina: PaginaLayoutGraficos) {
    return this.api.get<LayoutGraficos>(`/graficos/layout/${pagina}`);
  }

  guardarLayout(pagina: PaginaLayoutGraficos, widgets: WidgetLayoutGrafico[]) {
    return this.api.put<LayoutGraficos>(`/graficos/layout/${pagina}`, { widgets });
  }
}
