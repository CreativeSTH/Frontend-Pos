import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Renderer2,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Icon } from '../../atoms/icon/icon';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

const MAX_RESULTADOS = 30;
const MIN_CARACTERES_BUSQUEDA = 2;

/** Quita tildes/diacríticos para que "bogota" encuentre "Bogotá". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Select buscable para listas largas (cientos/miles de opciones) donde `ds-select`
 * no alcanza — ese componente lee `<option>` proyectadas y no filtra, así que
 * renderizar 1000+ filas ahí sin buscador es inviable. Mismo patrón de portal a
 * `document.body` con posición `fixed` que `ds-select` (por la misma razón: vive
 * dentro de `ds-modal`, cuyo `overflow-y: auto` recortaría un panel `fixed` que
 * siga siendo su descendiente en el DOM).
 *
 * Nunca renderiza más de `MAX_RESULTADOS` filas a la vez — sin eso, tipear una
 * sola letra sobre una lista de 1123 municipios seguiría montando cientos de
 * nodos. Exige un mínimo de caracteres antes de mostrar resultados en vez de
 * listar todo de entrada, para forzar el flujo "buscar primero".
 */
@Component({
  selector: 'ds-combobox',
  standalone: true,
  imports: [Icon],
  templateUrl: './combobox.html',
  styleUrl: './combobox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Combobox),
      multi: true,
    },
  ],
})
export class Combobox implements ControlValueAccessor {
  readonly options = input.required<ComboboxOption[]>();
  readonly placeholder = input<string>('Buscar...');
  readonly icon = input<string | undefined>(undefined);
  readonly invalid = input<boolean>(false);

  private readonly renderer = inject(Renderer2);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly highlighted = signal(0);
  protected readonly panelTop = signal(0);
  protected readonly panelLeft = signal(0);
  protected readonly panelWidth = signal(0);

  protected readonly selectedOption = computed(() =>
    this.options().find((o) => o.value === this.value()),
  );

  protected readonly resultados = computed<ComboboxOption[]>(() => {
    const q = normalizar(this.query().trim());
    if (q.length < MIN_CARACTERES_BUSQUEDA) return [];
    const encontrados: ComboboxOption[] = [];
    for (const opt of this.options()) {
      if (normalizar(opt.label).includes(q) || (opt.sublabel && normalizar(opt.sublabel).includes(q))) {
        encontrados.push(opt);
        if (encontrados.length >= MAX_RESULTADOS) break;
      }
    }
    return encontrados;
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly onOutsideScroll = (event: Event): void => {
    if (!this.open()) return;
    const target = event.target as Node;
    if (this.panel().nativeElement.contains(target)) return;
    this.close();
  };

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.renderer.appendChild(document.body, this.panel().nativeElement);
      document.addEventListener('scroll', this.onOutsideScroll, true);

      destroyRef.onDestroy(() => {
        document.removeEventListener('scroll', this.onOutsideScroll, true);
        const panelEl = this.panel().nativeElement;
        if (panelEl.parentElement === document.body) {
          this.renderer.removeChild(document.body, panelEl);
        }
      });
    });
  }

  protected toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    this.query.set('');
    this.highlighted.set(0);
    this.positionPanel();
    this.open.set(true);
    queueMicrotask(() => this.searchInput()?.nativeElement.focus());
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  private positionPanel(): void {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    this.panelLeft.set(Math.min(rect.left, maxLeft));
    this.panelTop.set(rect.bottom + 6);
    this.panelWidth.set(rect.width);
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.highlighted.set(0);
  }

  protected selectOption(opt: ComboboxOption): void {
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const resultados = this.resultados();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (resultados.length > 0) this.highlighted.set((this.highlighted() + 1) % resultados.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (resultados.length > 0) {
          this.highlighted.set((this.highlighted() - 1 + resultados.length) % resultados.length);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (resultados[this.highlighted()]) this.selectOption(resultados[this.highlighted()]);
        break;
      case 'Escape':
        event.stopPropagation();
        this.close();
        this.trigger().nativeElement.focus();
        break;
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.openPanel();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node;
    const insideTrigger = this.trigger().nativeElement.contains(target);
    const insidePanel = this.panel().nativeElement.contains(target);
    if (!insideTrigger && !insidePanel) {
      this.close();
    }
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) this.close();
  }
}
