import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SucursalContextService } from '../services/sucursal-context.service';
import { SucursalesService } from '../services/sucursales.service';

/**
 * Exige que un usuario sin `sucursalId` fijo (admin que supervisa varias sucursales)
 * elija una antes de ver pantallas operativas (Dashboard, Punto de venta, Caja) —
 * evita que "el primer turno abierto" se resuelva ambiguamente entre sucursales.
 */
export const sucursalGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const sucursalContext = inject(SucursalContextService);
  const sucursalesService = inject(SucursalesService);
  const router = inject(Router);

  if (!authService.isAuthenticated() || authService.esSistema()) {
    return true;
  }

  const usuario = authService.usuario();
  if (usuario?.sucursalId || sucursalContext.sucursalId()) {
    return true;
  }

  return sucursalesService.findAll().pipe(
    map((sucursales) => {
      if (sucursales.length <= 1) {
        if (sucursales.length === 1) {
          sucursalContext.elegir(sucursales[0].id);
        }
        return true;
      }
      return router.createUrlTree(['/seleccionar-sucursal'], {
        queryParams: { redirect: state.url },
      });
    }),
    catchError(() => of(true)),
  );
};
