import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CajaService } from '../services/caja.service';
import { SucursalContextService } from '../services/sucursal-context.service';
import { SucursalesService } from '../services/sucursales.service';

/** Landing: Negocios si es un usuario de plataforma; si no, Punto de Venta con turno abierto o Dashboard. */
export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const cajaService = inject(CajaService);
  const sucursalContext = inject(SucursalContextService);
  const sucursalesService = inject(SucursalesService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authService.esSistema()) {
    return router.createUrlTree(['/negocios']);
  }

  const decidirDestino = (sucursalId?: string) =>
    cajaService.findAllTurnos(sucursalId).pipe(
      map((turnos) =>
        router.createUrlTree([turnos.some((t) => t.estado === 'ABIERTO') ? '/punto-venta' : '/dashboard']),
      ),
    );

  // Sin esto, un admin multi-sucursal que aún no eligió terminaba con "el primer
  // turno ABIERTO de cualquier sucursal" decidiendo el destino — ver landingGuard
  // en la auditoría de deuda técnica de sucursal-filtering.
  const sucursalResuelta = authService.usuario()?.sucursalId ?? sucursalContext.sucursalId();
  if (sucursalResuelta) {
    return decidirDestino(sucursalResuelta).pipe(catchError(() => of(router.createUrlTree(['/dashboard']))));
  }

  return sucursalesService.findAll().pipe(
    switchMap((sucursales) => {
      if (sucursales.length <= 1) {
        if (sucursales.length === 1) {
          sucursalContext.elegir(sucursales[0].id);
        }
        return decidirDestino(sucursales[0]?.id);
      }
      return of(router.createUrlTree(['/seleccionar-sucursal'], { queryParams: { redirect: '/dashboard' } }));
    }),
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
