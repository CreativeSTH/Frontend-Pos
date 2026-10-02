import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { AyudaService } from '../../../core/services/ayuda.service';
import { ArticuloAyuda, IndiceAyuda } from '../../../core/models/ayuda.model';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Un artículo del Centro de ayuda; el HTML viene de la landing y se viste con los estilos de AURA. */
@Component({
  selector: 'app-ayuda-articulo',
  standalone: true,
  imports: [RouterLink, Topbar, EmptyState, Button, Icon],
  templateUrl: './ayuda-articulo.html',
  styleUrl: './ayuda-articulo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaArticulo {
  private readonly ayuda = inject(AyudaService);
  private readonly router = inject(Router);

  protected readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: '',
  });

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly indice = signal<IndiceAyuda | null>(null);

  protected readonly articulo = computed(() => this.indice()?.articulos.find((a) => a.slug === this.slug()) ?? null);
  protected readonly categoria = computed(
    () => this.indice()?.categorias.find((c) => c.id === this.articulo()?.categoria) ?? null,
  );
  protected readonly relacionados = computed(() => {
    const indice = this.indice();
    const articulo = this.articulo();
    if (!indice || !articulo) return [];
    return articulo.relacionados
      .map((s) => indice.articulos.find((a) => a.slug === s))
      .filter((a): a is ArticuloAyuda => !!a);
  });
  protected readonly urlPublica = computed(() => this.ayuda.urlPublica(this.slug()));

  constructor() {
    // Al pasar de un artículo a otro (relacionados o enlaces del cuerpo) el componente se reutiliza: volver arriba.
    effect(() => {
      this.slug();
      window.scrollTo({ top: 0 });
    });
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

  /** '2026-10-01' → '1 de octubre de 2026' (la app no tiene locale es para DatePipe; es un día calendario, no un instante). */
  protected fechaLarga(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
  }

  /** Enlaces del cuerpo: /ayuda/... navega dentro de AURA; los externos abren en otra pestaña. */
  protected alHacerClic(evento: MouseEvent): void {
    const enlace = (evento.target as HTMLElement).closest('a');
    const href = enlace?.getAttribute('href');
    if (!enlace || !href) return;
    if (href.startsWith('/ayuda')) {
      evento.preventDefault();
      this.router.navigateByUrl(href);
    } else if (/^https?:\/\//.test(href)) {
      evento.preventDefault();
      window.open(href, '_blank', 'noopener');
    }
  }
}
