import { Injectable, signal } from '@angular/core';

/**
 * Estado del sidebar off-canvas en tablet/mobile. Vive en un servicio porque
 * Topbar (el botón hamburguesa) y Sidebar están en ramas distintas del árbol
 * de componentes — cada página instancia su propio <app-topbar>, así que no
 * hay un padre común práctico para pasar esto por @Input/@Output.
 */
@Injectable({ providedIn: 'root' })
export class MobileNavService {
  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
