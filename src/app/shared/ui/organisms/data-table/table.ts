import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Shell de tabla con la estética glass del DS. El contenido (thead/tbody)
 * lo aporta cada página vía content projection — mantiene la consistencia
 * visual sin forzar una API genérica de columnas.
 */
@Component({
  selector: 'ds-table',
  standalone: true,
  template: `
    <div class="ds-table-shell">
      <table class="ds-table">
        <ng-content />
      </table>
    </div>
  `,
  styleUrl: './table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table {}
