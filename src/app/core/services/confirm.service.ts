import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Usa el botón de confirmar en tono destructivo (eliminar, cancelar, etc.). */
  danger?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/** Reemplazo del `confirm()` nativo del navegador — consistente con el look de la app. Ver `ds-confirm-dialog`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();

  ask(options: ConfirmOptions | string): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      this._state.set({ options: opts, resolve });
    });
  }

  responder(valor: boolean): void {
    this._state()?.resolve(valor);
    this._state.set(null);
  }
}
