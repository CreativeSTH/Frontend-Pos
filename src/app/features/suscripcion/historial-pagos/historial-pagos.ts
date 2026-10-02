import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { PagoSuscripcion } from '../../../core/models/suscripcion.model';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Badge, BadgeTone } from '../../../shared/ui/atoms/badge/badge';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';

const POR_PAGINA = 10;
// Intl y no DatePipe: la app no tiene locale `es` registrado para Angular.
const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const METODOS: Record<PagoSuscripcion['metodo'], string> = { QR: 'QR', TARJETA: 'Tarjeta', NEQUI: 'Nequi', PSE: 'PSE' };
const ESTADOS: Record<PagoSuscripcion['estado'], { texto: string; tono: BadgeTone }> = {
  APROBADA: { texto: 'Aprobado', tono: 'success' },
  PENDIENTE: { texto: 'Pendiente', tono: 'warning' },
  DECLINADA: { texto: 'Rechazado', tono: 'danger' },
};

/** Historial de cobros de la suscripción dentro de Mi plan (spec 2026-10-01, 4.1 c). */
@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [Table, Badge, Paginator, EmptyState],
  templateUrl: './historial-pagos.html',
  styleUrl: './historial-pagos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialPagos {
  private readonly suscripcion = inject(SuscripcionService);

  protected readonly pagos = signal<PagoSuscripcion[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly cargando = signal(true);

  constructor() {
    this.recargar();
  }

  /** Público: Mi plan lo llama tras un pago para que aparezca sin recargar la página. */
  recargar(pagina = this.pagina()): void {
    this.cargando.set(true);
    this.suscripcion.pagos(pagina, POR_PAGINA).subscribe({
      next: (r) => {
        this.pagos.set(r.items);
        this.total.set(r.total);
        this.pagina.set(r.pagina);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / POR_PAGINA));
  }

  protected fecha(iso: string): string {
    return formatoFecha.format(new Date(iso));
  }

  protected monto(centavos: number): string {
    return pesos.format(Number(centavos) / 100);
  }

  protected metodo(m: PagoSuscripcion['metodo']): string {
    return METODOS[m] ?? m;
  }

  protected estado(e: PagoSuscripcion['estado']): { texto: string; tono: BadgeTone } {
    return ESTADOS[e] ?? { texto: e, tono: 'neutral' };
  }
}
