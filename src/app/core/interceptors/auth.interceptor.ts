import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/catalogo-cliente/')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // Antes de perder la pantalla actual: si el POS tiene una venta en curso, que se guarde
        // sola como suspendida en vez de desaparecer sin rastro. Evento en vez de llamar a un
        // servicio de venta acá directamente — este interceptor no tiene por qué saber qué
        // pantalla está activa ni cómo se guarda su estado.
        window.dispatchEvent(new CustomEvent('pos:sesion-expirada'));
        authService.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
