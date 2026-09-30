import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ConexionService, esErrorDeConexion } from '../services/conexion.service';
import { environment } from '../../../environments/environment';

/** Una respuesta sin conexión (0 o 504 del service worker) del backend, no del pos-agent (fase 6b). */
export const conexionInterceptor: HttpInterceptorFn = (req, next) => {
  const conexion = inject(ConexionService);
  return next(req).pipe(
    catchError((error) => {
      if (esErrorDeConexion(error) && req.url.startsWith(environment.apiUrl)) conexion.marcarSinConexion();
      return throwError(() => error);
    }),
  );
};
