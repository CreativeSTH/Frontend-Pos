import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ClienteAuthService } from '../services/cliente-auth.service';

export const clienteAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/catalogo-cliente/')) {
    return next(req);
  }

  const clienteAuthService = inject(ClienteAuthService);
  const token = clienteAuthService.token;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        clienteAuthService.logout();
      }
      return throwError(() => error);
    }),
  );
};
