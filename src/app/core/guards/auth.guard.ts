import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CajaService } from '../services/caja.service';

/** Landing: Punto de Venta si hay un turno de caja abierto, si no Dashboard. */
export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const cajaService = inject(CajaService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
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

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
