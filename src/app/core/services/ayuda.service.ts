import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IndiceAyuda } from '../models/ayuda.model';

/**
 * Centro de ayuda: los artículos viven en la landing (fuente única) y AURA solo los lee.
 * HttpClient directo y no ApiService: es otro dominio (el interceptor de auth tampoco le manda el token).
 */
@Injectable({ providedIn: 'root' })
export class AyudaService {
  private readonly http = inject(HttpClient);
  private cache$: Observable<IndiceAyuda> | null = null;

  indice(): Observable<IndiceAyuda> {
    if (!this.cache$) {
      this.cache$ = this.http.get<IndiceAyuda>(`${environment.landingUrl}/ayuda/articulos.json`).pipe(
        // Un error no se queda en caché: "Reintentar" vuelve a pedirlo.
        catchError((err) => {
          this.cache$ = null;
          return throwError(() => err);
        }),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  urlPublica(slug?: string): string {
    return `${environment.landingUrl}/ayuda${slug ? `/${slug}` : ''}`;
  }
}
