import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly nextId = signal(1);
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(tone: ToastTone, text: string): void {
    const id = this.nextId();
    this.nextId.set(id + 1);
    this._toasts.update((list) => [...list, { id, tone, text }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
}
