import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'ds-image-upload',
  standalone: true,
  imports: [Icon],
  templateUrl: './image-upload.html',
  styleUrl: './image-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUpload {
  private readonly destroyRef = inject(DestroyRef);

  /** URL ya existente (modo edición), antes de elegir un archivo nuevo. */
  readonly existingUrl = input<string | null | undefined>(undefined);
  readonly label = input<string>('Imagen del producto');

  readonly fileSelected = output<File | null>();

  private readonly localPreview = signal<string | null>(null);
  protected readonly previewUrl = computed(() => this.localPreview() ?? this.existingUrl() ?? null);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeLocalPreview());
  }

  protected openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected handleFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.revokeLocalPreview();
    this.localPreview.set(URL.createObjectURL(file));
    this.fileSelected.emit(file);
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.revokeLocalPreview();
    this.fileSelected.emit(null);
    const inputEl = this.fileInput()?.nativeElement;
    if (inputEl) inputEl.value = '';
  }

  private revokeLocalPreview(): void {
    const current = this.localPreview();
    if (current) {
      URL.revokeObjectURL(current);
      this.localPreview.set(null);
    }
  }
}
