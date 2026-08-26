import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { clienteAuthInterceptor } from './core/interceptors/cliente-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // 'always': las rutas hijas de la tienda online (carrito, login, registro, cuenta) necesitan
    // heredar `negocioId` del segmento padre `tienda/:negocioId` — el default 'emptyOnly' solo
    // propaga parámetros del padre a hijos de path vacío (por eso el catálogo, en path '', ya
    // funcionaba sin esto, pero el resto de rutas de la tienda recibían negocioId=null).
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([clienteAuthInterceptor, authInterceptor])),
  ],
};
