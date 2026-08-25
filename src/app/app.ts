import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('pos-frontend');
  /** Inyectado para que se instancie al arrancar la app y aplique data-theme antes de pintar. */
  private readonly theme = inject(ThemeService);
}
