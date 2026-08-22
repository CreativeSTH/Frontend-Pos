import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CajaService } from '../services/caja.service';

/** Landing: Negocios si es un usuario de plataforma; si no, Punto de Venta con turno abierto o Dashboard. */
export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const cajaService = inject(CajaService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authService.esSistema()) {
    return router.createUrlTree(['/negocios']);
  }

  return cajaService.findAllTurnos().pipe(
    map((turnos) =>
      router.createUrlTree([turnos.some((t) => t.estado === 'ABIERTO') ? '/punto-venta' : '/dashboard']),
    ),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/** Bloquea pantallas operativas de un negocio (Dashboard, Punto de venta) a usuarios de tier SISTEMA, que no pertenecen a ninguno. */
export const soloNegocioGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return !authService.esSistema() || router.createUrlTree(['/negocios']);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
