import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Spinner } from '../../../shared/ui/atoms/spinner/spinner';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { DevolucionesService } from '../../../core/services/devoluciones.service';
import { ImpresionComprobanteService } from '../../../core/services/impresion-comprobante.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConexionService } from '../../../core/services/conexion.service';
import { Devolucion, Devolvible, ETIQUETA_FORMA, FormaReembolso } from '../../../core/models/devolucion.model';

interface LineaForm {
  ventaItemId: string;
  nombre: string;
  disponible: number;
  netoPorUnidad: number;
  cantidad: number;
  vuelve: boolean;
  motivoBaja: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Devolución parcial o total de una venta (spec 2026-10-02). El backend recalcula el valor exacto
 * (redondeo acumulado) y valida todo; acá solo se arma la solicitud y se propone el reembolso.
 */
@Component({
  selector: 'app-modal-devolucion',
  standalone: true,
  imports: [Modal, Button, Input, Switch, Spinner, FormField, FormsModule],
  templateUrl: './modal-devolucion.html',
  styleUrl: './modal-devolucion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalDevolucion implements OnInit {
  readonly ventaId = input.required<string>();
  readonly close = output<void>();
  readonly devuelta = output<Devolucion>();

  private readonly devoluciones = inject(DevolucionesService);
  private readonly impresion = inject(ImpresionComprobanteService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly conexion = inject(ConexionService);

  protected readonly etiquetas = ETIQUETA_FORMA;
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly datos = signal<Devolvible | null>(null);
  protected readonly lineas = signal<LineaForm[]>([]);
  protected readonly motivo = signal('');
  protected readonly pin = signal('');
  protected readonly montos = signal<Record<FormaReembolso, number>>({ EFECTIVO: 0, DESCUENTO_DEUDA: 0, SALDO_A_FAVOR: 0 });

  /** Sin DEVOLUCIONES:CREAR se necesita el PIN de alguien que lo tenga (igual que cancelar venta). */
  protected readonly requierePin = computed(() => !this.auth.tienePermiso('DEVOLUCIONES', 'CREAR'));

  protected readonly total = computed(() => r2(this.lineas().reduce((s, l) => s + l.cantidad * l.netoPorUnidad, 0)));
  protected readonly sumaReembolsos = computed(() =>
    r2(Object.values(this.montos()).reduce((s, m) => s + (Number(m) || 0), 0)),
  );
  protected readonly reembolsoCuadra = computed(() => Math.abs(this.sumaReembolsos() - this.total()) <= 1);

  /** Deuda primero (si la venta es a crédito con saldo), luego efectivo, y saldo a favor si hay cliente. */
  protected readonly formasHabilitadas = computed<FormaReembolso[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const formas: FormaReembolso[] = [];
    if (d.saldoDeudaVenta > 0) formas.push('DESCUENTO_DEUDA');
    formas.push('EFECTIVO');
    if (d.tieneCliente) formas.push('SALDO_A_FAVOR');
    return formas;
  });

  protected readonly puedeConfirmar = computed(
    () => !!this.datos() && !this.datos()!.bloqueo && this.conexion.enLinea() && this.lineas().length > 0,
  );

  ngOnInit(): void {
    this.devoluciones.devolvible(this.ventaId()).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.lineas.set(
          d.lineas
            .filter((l) => l.disponible > 0)
            .map((l) => ({
              ventaItemId: l.ventaItemId,
              nombre: l.nombreProducto,
              disponible: l.disponible,
              netoPorUnidad: l.netoPorUnidad,
              cantidad: 0,
              vuelve: true,
              motivoBaja: '',
            })),
        );
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(
          this.conexion.enLinea()
            ? (err.error?.message ?? 'No se pudo cargar la venta')
            : 'Las devoluciones están disponibles cuando vuelva la conexión',
        );
        this.close.emit();
      },
    });
  }

  protected actualizarCantidad(i: number, valor: number | string): void {
    const linea = this.lineas()[i];
    const cantidad = Math.min(Math.max(Number(valor) || 0, 0), linea.disponible);
    this.actualizarLinea(i, { cantidad });
    this.proponerReembolso();
  }

  protected actualizarLinea(i: number, cambio: Partial<LineaForm>): void {
    this.lineas.update((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambio } : l)));
  }

  protected devolverTodo(): void {
    this.lineas.update((ls) => ls.map((l) => ({ ...l, cantidad: l.disponible })));
    this.proponerReembolso();
  }

  /** Spec 3.3: primero la deuda hasta su tope, el resto en efectivo; el cajero puede cambiarlo. */
  private proponerReembolso(): void {
    const total = this.total();
    const deuda = Math.min(total, this.datos()?.saldoDeudaVenta ?? 0);
    this.montos.set({ DESCUENTO_DEUDA: r2(deuda), EFECTIVO: r2(total - deuda), SALDO_A_FAVOR: 0 });
  }

  protected actualizarMonto(forma: FormaReembolso, valor: number | string): void {
    this.montos.update((m) => ({ ...m, [forma]: Number(valor) || 0 }));
  }

  protected pistaForma(forma: FormaReembolso): string {
    const d = this.datos();
    if (!d) return '';
    if (forma === 'DESCUENTO_DEUDA') return `Hasta ${this.money(d.saldoDeudaVenta)} (saldo pendiente de la venta)`;
    if (forma === 'EFECTIVO') {
      return d.efectivoDisponible === null ? 'No hay turno de caja abierto en esta sucursal' : `En caja: ${this.money(d.efectivoDisponible)}`;
    }
    return 'Queda como crédito del cliente para su próxima compra';
  }

  protected confirmar(): void {
    const items = this.lineas().filter((l) => l.cantidad > 0);
    if (items.length === 0) return this.toast.error('Elige cuántas unidades se devuelven');
    if (!this.motivo().trim()) return this.toast.error('Escribe el motivo de la devolución');
    if (!this.reembolsoCuadra()) return this.toast.error('El reembolso debe sumar el total devuelto');
    if (this.requierePin() && !/^\d{4,6}$/.test(this.pin())) {
      return this.toast.error('Ingresa el PIN de un administrador (4 a 6 dígitos)');
    }

    const reembolsos = (Object.entries(this.montos()) as [FormaReembolso, number][])
      .filter(([, monto]) => monto > 0)
      .map(([forma, monto]) => ({ forma, monto: r2(monto) }));
    this.enviando.set(true);
    this.devoluciones
      .crear({
        ventaId: this.ventaId(),
        motivo: this.motivo().trim(),
        items: items.map((l) => ({
          ventaItemId: l.ventaItemId,
          cantidad: l.cantidad,
          vuelveAInventario: l.vuelve,
          motivoBaja: l.vuelve ? undefined : l.motivoBaja.trim() || undefined,
        })),
        reembolsos,
        pinAutorizacion: this.pin() || undefined,
      })
      .subscribe({
        next: (devolucion) => {
          this.enviando.set(false);
          this.toast.success(`Devolución ${devolucion.numeroCompleto} registrada`);
          // El cajón se abre solo si sale efectivo, como al cobrar.
          this.impresion
            .imprimirDevolucion(devolucion.id, { abrirCajon: reembolsos.some((r) => r.forma === 'EFECTIVO') })
            .subscribe();
          this.devuelta.emit(devolucion);
        },
        error: (err) => {
          this.enviando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo registrar la devolución');
        },
      });
  }

  protected money(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  }
}
