import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../../layout/topbar/topbar';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { AyudaService } from '../../../core/services/ayuda.service';
import { ArticuloAyuda, IndiceAyuda, filtrarArticulos } from '../../../core/models/ayuda.model';

/** Centro de ayuda dentro de AURA: los artículos los publica la landing (spec 2026-10-01). */
@Component({
  selector: 'app-ayuda-portada',
  standalone: true,
  imports: [RouterLink, Topbar, SearchBar, EmptyState, Button, Icon],
  templateUrl: './ayuda-portada.html',
  styleUrl: './ayuda-portada.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaPortada {
  private readonly ayuda = inject(AyudaService);

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly indice = signal<IndiceAyuda | null>(null);
  protected readonly consulta = signal('');
  protected readonly urlLanding = this.ayuda.urlPublica();

  /** Categorías con solo los artículos que coinciden con la búsqueda; las que quedan vacías no se muestran. */
  protected readonly categorias = computed(() => {
    const indice = this.indice();
    if (!indice) return [];
    const porSlug = new Map(indice.articulos.map((a) => [a.slug, a]));
    const visibles = new Set(filtrarArticulos(indice.articulos, this.consulta()).map((a) => a.slug));
    return indice.categorias
      .map((c) => ({
        ...c,
        items: c.articulos
          .filter((s) => visibles.has(s) && porSlug.has(s))
          .map((s) => porSlug.get(s) as ArticuloAyuda),
      }))
      .filter((c) => c.items.length > 0);
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.ayuda.indice().subscribe({
      next: (indice) => {
        this.indice.set(indice);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }
}
