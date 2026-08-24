import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly isLoading = signal(false);

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    return this.wrap(this.http.get<T>(`${this.baseUrl}${path}`, { params: this.buildParams(params) }));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.wrap(this.http.post<T>(`${this.baseUrl}${path}`, body));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.wrap(this.http.patch<T>(`${this.baseUrl}${path}`, body));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.wrap(this.http.put<T>(`${this.baseUrl}${path}`, body));
  }

  delete<T>(path: string): Observable<T> {
    return this.wrap(this.http.delete<T>(`${this.baseUrl}${path}`));
  }

  private buildParams(params?: Record<string, string | number | boolean | undefined>): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  private wrap<T>(request$: Observable<T>): Observable<T> {
    this.isLoading.set(true);
    return request$.pipe(finalize(() => this.isLoading.set(false)));
  }
}
