import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClienteAuthService } from '../services/cliente-auth.service';

export const clienteAuthGuard: CanActivateFn = (route) => {
  const clienteAuthService = inject(ClienteAuthService);
  const router = inject(Router);
  const negocioId = route.paramMap.get('negocioId')!;

  if (clienteAuthService.token) {
    return true;
  }
  return router.createUrlTree([`/tienda/${negocioId}/login`]);
};
