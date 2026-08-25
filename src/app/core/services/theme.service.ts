import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'glass' | 'saas-dark' | 'saas-light';

const STORAGE_KEY = 'pos-tema';
const TEMAS_VALIDOS: Tema[] = ['glass', 'saas-dark', 'saas-light'];

function temaGuardado(): Tema {
  const valor = localStorage.getItem(STORAGE_KEY);
  return TEMAS_VALIDOS.includes(valor as Tema) ? (valor as Tema) : 'glass';
}

/** Aplica el tema visual (glass / saas-dark / saas-light) como `data-theme` en <html> — ver `_tokens.scss`. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly tema = signal<Tema>(temaGuardado());

  constructor() {
    effect(() => {
      const valor = this.tema();
      document.documentElement.setAttribute('data-theme', valor);
      localStorage.setItem(STORAGE_KEY, valor);
    });
  }

  cambiarTema(tema: Tema): void {
    this.tema.set(tema);
  }
}
