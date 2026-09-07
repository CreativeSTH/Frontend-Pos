import { Signal, WritableSignal, computed, signal } from '@angular/core';

const PAGE_SIZE_STORAGE_KEY = 'pos_page_size';

function leerPageSizeGuardado(porDefecto: number): number {
  try {
    const guardado = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    return guardado ? Number(guardado) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export interface Paginacion<T> {
  pagina: WritableSignal<number>;
  pageSize: WritableSignal<number>;
  totalPaginas: Signal<number>;
  paginaActual: Signal<number>;
  itemsPaginados: Signal<T[]>;
  cambiarPageSize(size: number): void;
}

/**
 * Paginación client-side reusable — antes cada pantalla de lista (productos, inventario, bodegas,
 * ventas, y ~15 más) repetía a mano el mismo trío `pagina`/`totalPaginas`/`itemsPaginados` con un
 * `pageSize` hardcodeado en 20. El tamaño elegido se persiste en `localStorage` y es compartido a
 * propósito entre todas las pantallas que usan este helper — es una preferencia del usuario
 * ("prefiero ver de a 50"), no algo particular de una pantalla puntual.
 *
 * Uso: `protected readonly pag = usePaginacion(this.filtrados);` y en el template
 * `pag.itemsPaginados()`, `[page]="pag.paginaActual()"`, `[pageSize]="pag.pageSize()"`,
 * `(pageChange)="pag.pagina.set($event)"`, `(pageSizeChange)="pag.cambiarPageSize($event)"`.
 */
/**
 * `items` acepta un `Signal<T[]>` real o una función plana `() => T[]` (varias pantallas ya
 * calculaban su lista filtrada así, sin envolverla en `computed()`) — cualquiera de las dos formas
 * dispara el tracking reactivo de Angular igual, porque lo que importa es qué signals se leen
 * *adentro* mientras el `computed()` de acá abajo está corriendo, no la forma de quien las expone.
 */
export function usePaginacion<T>(items: Signal<T[]> | (() => T[]), pageSizeDefault = 20): Paginacion<T> {
  const pagina = signal(1);
  const pageSize = signal(leerPageSizeGuardado(pageSizeDefault));
  const totalPaginas = computed(() => Math.max(1, Math.ceil(items().length / pageSize())));
  const paginaActual = computed(() => Math.min(pagina(), totalPaginas()));
  const itemsPaginados = computed(() => {
    const inicio = (paginaActual() - 1) * pageSize();
    return items().slice(inicio, inicio + pageSize());
  });

  function cambiarPageSize(size: number): void {
    pageSize.set(size);
    pagina.set(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      // localStorage puede no estar disponible (modo privado) — no es crítico, sigue funcionando en memoria.
    }
  }

  return { pagina, pageSize, totalPaginas, paginaActual, itemsPaginados, cambiarPageSize };
}
