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
import { Icon } from '../icon/icon';

interface DsSelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

/**
 * Select con panel de opciones propio — el popup nativo de <option> no se puede
 * estilar de forma consistente entre navegadores (sin padding, sin ancho propio,
 * sin esquinas redondeadas, highlight de hover controlado por el SO). Sigue
 * proyectando <option> tal cual las escribe cada página (no hay forma de leerlas
 * vía Angular content queries — @ContentChildren no soporta seleccionar una
 * etiqueta HTML arbitraria, solo directivas), así que se leen del DOM a través
 * de un <select> nativo oculto — migrar un <select> existente sigue siendo solo
 * cambiar la etiqueta, sin tocar los ~20 lugares que ya usan `<ds-select><option>`.
 *
 * El panel se reubica en `document.body` con posición `fixed` calculada a mano:
 * varios usos viven dentro de un `ds-modal`, cuyo `.modal-panel__body` tiene
 * `overflow-y: auto` — eso recorta cualquier descendiente posicionado, incluso
 * `fixed`, mientras siga siendo su descendiente en el DOM (un `backdrop-filter`
 * en `.modal-panel` además le da su propio containing block a los `fixed`, así
 * que ni con `fixed` alcanza sin mover el nodo). Portearlo fuera del subárbol
 * del modal es la única forma de que no quede recortado.
 */
@Component({
  selector: 'ds-select',
  standalone: true,
  imports: [Icon],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
})
export class Select implements ControlValueAccessor {
  readonly icon = input<string | undefined>(undefined);
  readonly invalid = input<boolean>(false);

  private readonly renderer = inject(Renderer2);

  private readonly nativeSelect =
    viewChild.required<ElementRef<HTMLSelectElement>>('nativeSelect');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);
  protected readonly open = signal(false);
  protected readonly options = signal<DsSelectOption[]>([]);
  protected readonly highlighted = signal(0);
  protected readonly panelTop = signal(0);
  protected readonly panelLeft = signal(0);
  protected readonly panelWidth = signal(0);

  protected readonly selectedLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );

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
      this.syncOptions();

      const observer = new MutationObserver(() => this.syncOptions());
      observer.observe(this.nativeSelect().nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      document.addEventListener('scroll', this.onOutsideScroll, true);

      destroyRef.onDestroy(() => {
        observer.disconnect();
        document.removeEventListener('scroll', this.onOutsideScroll, true);
        const panelEl = this.panel().nativeElement;
        if (panelEl.parentElement === document.body) {
          this.renderer.removeChild(document.body, panelEl);
        }
      });
    });
  }

  private syncOptions(): void {
    const opts = Array.from(this.nativeSelect().nativeElement.querySelectorAll('option'));
    this.options.set(
      opts.map((opt) => ({
        value: opt.value,
        label: opt.textContent?.trim() ?? '',
        disabled: opt.disabled,
      })),
    );
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
    const idx = this.options().findIndex((o) => o.value === this.value());
    this.highlighted.set(idx >= 0 ? idx : 0);
    this.positionPanel();
    this.open.set(true);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  /**
   * Antes siempre abría hacia abajo — si el select vive cerca del borde inferior del viewport
   * (el caso típico: el selector de tamaño de página, al final de una lista larga), el panel
   * quedaba parcialmente cortado por la ventana. El panel sigue en el DOM con `visibility: hidden`
   * mientras está cerrado (no `display: none`), así que ya tiene un alto real medible antes de
   * decidir para qué lado abrir.
   */
  private positionPanel(): void {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    this.panelLeft.set(Math.min(rect.left, maxLeft));
    this.panelWidth.set(rect.width);

    const panelHeight = this.panel().nativeElement.getBoundingClientRect().height;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abreHaciaArriba = espacioAbajo < panelHeight + 6 && rect.top > panelHeight + 6;
    this.panelTop.set(abreHaciaArriba ? rect.top - panelHeight - 6 : rect.bottom + 6);
  }

  protected selectOption(opt: DsSelectOption): void {
    if (opt.disabled) return;
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const opts = this.options();
    if (opts.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.highlighted.set(this.stepIndex(this.highlighted(), 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.highlighted.set(this.stepIndex(this.highlighted(), -1));
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.selectOption(opts[this.highlighted()]);
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.stopPropagation();
          this.close();
        }
        break;
    }
  }

  private stepIndex(from: number, dir: 1 | -1): number {
    const opts = this.options();
    let i = from;
    for (let step = 0; step < opts.length; step++) {
      i = (i + dir + opts.length) % opts.length;
      if (!opts[i].disabled) return i;
    }
    return from;
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

  protected handleBlur(): void {
    this.onTouched();
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
    if (isDisabled) {
      this.close();
    }
  }
}
