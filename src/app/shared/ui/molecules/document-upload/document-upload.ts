import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

/** Subida genérica de un documento (PDF/imagen) — a diferencia de ds-image-upload, no asume que el archivo se pueda previsualizar como imagen. */
@Component({
  selector: 'ds-document-upload',
  standalone: true,
  imports: [Icon],
  templateUrl: './document-upload.html',
  styleUrl: './document-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentUpload {
  /** URL ya existente (modo edición), antes de elegir un archivo nuevo. */
  readonly existingUrl = input<string | null | undefined>(undefined);
  readonly label = input<string>('Documento');
  readonly hint = input<string>('PDF, JPG, PNG o WEBP · máx. 5MB');

  readonly fileSelected = output<File | null>();

  protected readonly nombreArchivo = signal<string | null>(null);
  protected readonly tieneDocumento = computed(() => !!this.nombreArchivo() || !!this.existingUrl());

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected handleFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.nombreArchivo.set(file.name);
    this.fileSelected.emit(file);
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.nombreArchivo.set(null);
    this.fileSelected.emit(null);
    const inputEl = this.fileInput()?.nativeElement;
    if (inputEl) inputEl.value = '';
  }
}
