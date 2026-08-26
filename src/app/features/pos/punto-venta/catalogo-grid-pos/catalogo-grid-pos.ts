import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ProductCard } from '../../../../shared/ui/molecules/product-card/product-card';
import { EmptyState } from '../../../../shared/ui/molecules/empty-state/empty-state';
import { Skeleton } from '../../../../shared/ui/atoms/skeleton/skeleton';
import { Producto } from '../../../../core/models/producto.model';
import { PrecioVigente } from '../../../../core/models/promocion.model';
import { formatMoney, imageUrl } from '../pos-shared.util';

/** Cuántas tarjetas se pintan de entrada y cuántas más por cada vez que el centinela entra en pantalla — el catálogo entero ya está en memoria (hace falta completo para que el escaneo de código de barras y la búsqueda sigan encontrando cualquier producto), esto solo limita cuántas se renderizan de una. */
const LOTE_INICIAL = 60;
const LOTE_SIGUIENTE = 40;
/** Cuántas tarjetas fantasma mostrar mientras `cargando()` es true (ver `PuntoVenta.cargandoStock`). */
const TARJETAS_SKELETON = Array.from({ length: 12 });

/** Grilla de productos del catálogo — presentacional, ya recibe la lista filtrada completa; ella sola decide cuánto renderizar de entrada y va agrandando el lote al scrollear. */
@Component({
  selector: 'app-catalogo-grid-pos',
  standalone: true,
  imports: [ProductCard, EmptyState, Skeleton],
  templateUrl: './catalogo-grid-pos.html',
  styleUrl: './catalogo-grid-pos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoGridPos {
  readonly productos = input.required<Producto[]>();
  readonly stockPorProducto = input.required<Map<string, number>>();
  /** Promociones automáticas vigentes por producto, para la etiqueta "Promoción" + antes/ahora. */
  readonly preciosVigentes = input<Map<string, PrecioVigente>>(new Map());
  /** `true` mientras se recarga el stock de la bodega activa (ej. recién cambiada de sucursal) — muestra tarjetas fantasma en vez de un "Sin resultados" engañoso mientras todavía no se sabe qué hay. */
  readonly cargando = input(false);

  readonly seleccionar = output<Producto>();

  protected readonly imageUrl = imageUrl;
  protected readonly formatMoney = formatMoney;
  protected readonly tarjetasSkeleton = TARJETAS_SKELETON;

  private readonly sentinela = viewChild<ElementRef<HTMLElement>>('sentinela');
  private readonly destroyRef = inject(DestroyRef);
  private observer: IntersectionObserver | null = null;

  protected readonly visibleCount = signal(LOTE_INICIAL);
  protected readonly productosVisibles = computed(() => this.productos().slice(0, this.visibleCount()));
  protected readonly hayMas = computed(() => this.visibleCount() < this.productos().length);

  constructor() {
    // Cada vez que cambia la lista filtrada (nueva búsqueda, categoría, o bodega) arranca de nuevo
    // desde el primer lote — es el mismo criterio que ya usa `productosFiltrados` en `PuntoVenta`:
    // un cambio de filtro es un contexto nuevo, no continuación del scroll anterior.
    effect(() => {
      this.productos();
      this.visibleCount.set(LOTE_INICIAL);
    });

    // El observer se arma una sola vez que el centinela existe (aparece recién cuando hay más
    // productos que el lote inicial — ver template) y se destruye solo con el componente.
    effect(() => {
      const elemento = this.sentinela()?.nativeElement;
      if (!elemento) return;
      this.observer?.disconnect();
      this.observer = new IntersectionObserver((entradas) => {
        if (entradas[0]?.isIntersecting) {
          this.visibleCount.update((v) => v + LOTE_SIGUIENTE);
        }
      });
      this.observer.observe(elemento);
    });

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  protected stockDe(productoId: string): number {
    return this.stockPorProducto().get(productoId) ?? 0;
  }

  protected precioVigenteDe(productoId: string): PrecioVigente | undefined {
    return this.preciosVigentes().get(productoId);
  }
}
