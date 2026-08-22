import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AccionPermiso, ModuloPermiso } from '../models/auth.model';

/** Protección de ruta a nivel frontend (UX) — la protección real vive en el backend (PermissionsGuard). */
export function permisoGuard(modulo: ModuloPermiso, accion: AccionPermiso = 'VER'): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    return auth.tienePermiso(modulo, accion) || router.createUrlTree(['/dashboard']);
  };
}
