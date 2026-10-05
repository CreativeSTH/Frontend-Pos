import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  isDevMode,
  LOCALE_ID,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { conexionInterceptor } from './core/interceptors/conexion.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { clienteAuthInterceptor } from './core/interceptors/cliente-auth.interceptor';

// Sin esto los pipes `date`/`number` salen en inglés ("Oct 5, 2026, 3:52:00 PM", "1,234.5").
// es-CO: "5/10/2026, 3:52:00 p. m." y "1.234,5", igual que los Intl('es-CO') que ya usan formatMoney y compañía.
registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // 'always': las rutas hijas de la tienda online (carrito, login, registro, cuenta) necesitan
    // heredar `negocioId` del segmento padre `tienda/:negocioId` — el default 'emptyOnly' solo
    // propaga parámetros del padre a hijos de path vacío (por eso el catálogo, en path '', ya
    // funcionaba sin esto, pero el resto de rutas de la tienda recibían negocioId=null).
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    // Fase 6b: la app (no la API) queda en caché para poder recargar el POS sin internet. Solo en producción.
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
    provideHttpClient(withInterceptors([conexionInterceptor, clienteAuthInterceptor, authInterceptor])),
  ],
};
