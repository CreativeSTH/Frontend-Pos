import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Thumbnail } from '../../../shared/ui/atoms/thumbnail/thumbnail';
import { ProductCard } from '../../../shared/ui/molecules/product-card/product-card';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { ProductosService } from '../../../core/services/productos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { CajaService } from '../../../core/services/caja.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { PrintAgentService } from '../../../core/services/print-agent.service';
import { AuthService } from '../../../core/services/auth.service';
import { VentasSuspendidasService, VentaSuspendida } from '../../../core/services/ventas-suspendidas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Producto } from '../../../core/models/producto.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Bodega } from '../../../core/models/bodega.model';
import { TurnoCaja } from '../../../core/models/caja.model';
import { MetodoPago, Venta } from '../../../core/models/venta.model';
import { Cliente, VerificarCreditoResponse } from '../../../core/models/cliente.model';
import { environment } from '../../../../environments/environment';

interface LineaPago {
  metodoPago: MetodoPago;
  monto: number;
}

interface LineaCarrito {
  productoId: string;
  nombre: string;
  imagenUrl?: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  porcentajeImpuesto: number;
}

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
];

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Icon,
    Badge,
    Thumbnail,
    ProductCard,
    SearchBar,
    EmptyState,
    FormField,
    Input,
    Select,
    Switch,
    Modal,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './punto-venta.html',
  styleUrl: './punto-venta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuntoVenta {
  private readonly productosService = inject(ProductosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly bodegasService = inject(BodegasService);
  private readonly cajaService = inject(CajaService);
  private readonly ventasService = inject(VentasService);
  private readonly clientesService = inject(ClientesService);
  protected readonly printAgent = inject(PrintAgentService);
  private readonly auth = inject(AuthService);
  private readonly ventasSuspendidasService = inject(VentasSuspendidasService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly sucursal = signal<Sucursal | null>(null);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly bodega = signal<Bodega | null>(null);
  protected readonly turno = signal<TurnoCaja | null>(null);

  protected readonly search = signal('');
  protected readonly carrito = signal<LineaCarrito[]>([]);
  protected readonly procesando = signal(false);

  protected readonly showCobro = signal(false);
  protected readonly pagos = signal<LineaPago[]>([]);
  protected readonly descuentoActivo = signal(false);
  protected readonly descuentoVenta = signal<number>(0);
  protected readonly metodosPago = METODOS_PAGO;

  protected readonly tipoVenta = signal<'CONTADO' | 'CREDITO'>('CONTADO');
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly clienteId = signal<string>('');
  protected readonly numeroCuotas = signal<number>(1);
  protected readonly fechaPrimerPago = signal<string>('');
  protected readonly verificacionCredito = signal<VerificarCreditoResponse | null>(null);
  protected readonly verificandoCredito = signal(false);

  /**
   * Cliente opcional en ventas de contado — no confundir con `clienteId`,
   * que es el obligatorio de CREDITO. Flujo por etapas: se pide el
   * teléfono primero; si ya existe un cliente con ese número se confirma
   * cuál es antes de seleccionarlo, si no existe se piden los demás datos
   * para crear uno nuevo.
   */
  protected readonly clienteVentaActivo = signal(false);
  protected readonly clienteVentaEtapa = signal<'telefono' | 'nuevo' | 'seleccionado'>('telefono');
  protected readonly clienteVentaTelefono = signal<string>('');
  protected readonly clienteVentaSeleccionado = signal<Cliente | null>(null);
  protected readonly nuevoClienteNombre = signal<string>('');
  protected readonly creandoClienteVenta = signal(false);

  protected readonly showClienteExistente = signal(false);
  protected readonly clienteExistenteEncontrado = signal<Cliente | null>(null);

  protected readonly ventaCompletada = signal<Venta | null>(null);
  protected readonly imprimiendo = signal(false);
  protected readonly showConfirmarCerrarCaja = signal(false);
  protected readonly showConfirmarPausarCaja = signal(false);

  protected readonly ventasSuspendidas = this.ventasSuspendidasService.ventas;
  protected readonly showSuspenderVenta = signal(false);
  protected readonly notaSuspension = signal('');
  protected readonly showVentasSuspendidas = signal(false);
  protected readonly ventaSuspendidaARetomar = signal<VentaSuspendida | null>(null);
  protected readonly showConfirmarRetomar = signal(false);

  protected readonly productosFiltrados = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.productos();
    return this.productos().filter(
      (p) => p.nombre.toLowerCase().includes(term) || p.codigoBarras?.includes(term),
    );
  });

  protected readonly subtotal = computed(() =>
    this.carrito().reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0),
  );
  protected readonly impuesto = computed(() =>
    this.carrito().reduce((sum, l) => sum + l.precioUnitario * l.cantidad * (l.porcentajeImpuesto / 100), 0),
  );
  protected readonly total = computed(() =>
    Math.max(0, this.subtotal() + this.impuesto() - this.descuentoVenta()),
  );

  /**
   * El monto que el cajero escribe en una fila Efectivo es lo que el
   * cliente ENTREGÓ (puede superar lo que falta por pagar) — igual que en
   * un POS real, no un campo aparte de "efectivo recibido". Lo que se
   * aplica a la venta se recorta a lo que realmente falta; el resto es
   * cambio. Así el cajero solo necesita escribir un número en un solo
   * lugar, en la fila del método que está llenando.
   */
  protected readonly efectivoTendido = computed(() =>
    this.pagos()
      .filter((p) => p.metodoPago === 'EFECTIVO')
      .reduce((sum, p) => sum + p.monto, 0),
  );
  protected readonly montoOtrosMetodos = computed(() =>
    this.pagos()
      .filter((p) => p.metodoPago !== 'EFECTIVO')
      .reduce((sum, p) => sum + p.monto, 0),
  );
  protected readonly efectivoAplicado = computed(() =>
    Math.min(this.efectivoTendido(), Math.max(0, this.total() - this.montoOtrosMetodos())),
  );
  protected readonly cambio = computed(() => Math.max(0, this.efectivoTendido() - this.efectivoAplicado()));
  protected readonly totalPagado = computed(() => this.montoOtrosMetodos() + this.efectivoAplicado());
  protected readonly faltante = computed(() => Math.max(0, this.total() - this.totalPagado()));
  protected readonly tieneEfectivo = computed(() => this.pagos().some((p) => p.metodoPago === 'EFECTIVO'));

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      productos: this.productosService.findAll(),
      sucursales: this.sucursalesService.findAll(),
      bodegas: this.bodegasService.findAll(),
      turnos: this.cajaService.findAllTurnos(),
      clientes: this.clientesService.findAll(),
    }).subscribe({
      next: ({ productos, sucursales, bodegas, turnos, clientes }) => {
        this.productos.set(productos);
        this.sucursales.set(sucursales);
        this.bodegas.set(bodegas);
        const sucursal = sucursales[0] ?? null;
        this.sucursal.set(sucursal);
        this.bodega.set(bodegas.find((b) => b.sucursalId === sucursal?.id) ?? bodegas[0] ?? null);
        this.turno.set(turnos.find((t) => t.estado === 'ABIERTO') ?? null);
        this.clientes.set(clientes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el punto de venta');
      },
    });
  }

  /**
   * Cambiar de sucursal actualiza la bodega desde la que se descuenta stock.
   * El turno de caja sigue tomando "el primero abierto" sin filtrar por
   * sucursal (limitación ya existente en toda la app, no solo aquí) — con
   * una sola sucursal no aplica; con varias, cada una abre su propio turno
   * y esa parte del sistema no está preparada para elegir entre ellos.
   */
  protected cambiarSucursal(sucursalId: string): void {
    const sucursal = this.sucursales().find((s) => s.id === sucursalId);
    if (!sucursal) return;
    this.sucursal.set(sucursal);
    this.bodega.set(this.bodegas().find((b) => b.sucursalId === sucursal.id) ?? this.bodegas()[0] ?? null);
  }

  protected agregarAlCarrito(producto: Producto): void {
    this.carrito.update((lineas) => {
      const existente = lineas.find((l) => l.productoId === producto.id);
      if (existente) {
        return lineas.map((l) =>
          l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [
        ...lineas,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          imagenUrl: producto.imagenUrl,
          cantidad: 1,
          precioUnitario: producto.precioVenta,
          costoUnitario: producto.costo,
          porcentajeImpuesto: producto.porcentajeImpuesto,
        },
      ];
    });
  }

  protected onScanSubmit(codigo: string): void {
    const producto = this.productos().find((p) => p.codigoBarras === codigo);
    if (!producto) {
      this.toast.error(`Sin coincidencias para "${codigo}"`);
      return;
    }
    this.agregarAlCarrito(producto);
    this.search.set('');
  }

  protected incrementar(productoId: string): void {
    this.carrito.update((lineas) =>
      lineas.map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad + 1 } : l)),
    );
  }

  protected decrementar(productoId: string): void {
    this.carrito.update((lineas) =>
      lineas
        .map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad - 1 } : l))
        .filter((l) => l.cantidad > 0),
    );
  }

  protected quitar(productoId: string): void {
    this.carrito.update((lineas) => lineas.filter((l) => l.productoId !== productoId));
  }

  protected abrirSuspenderVenta(): void {
    if (this.carrito().length === 0) return;
    this.notaSuspension.set('');
    this.showSuspenderVenta.set(true);
  }

  protected confirmarSuspenderVenta(): void {
    this.ventasSuspendidasService.suspender(this.carrito(), this.descuentoVenta(), this.notaSuspension());
    this.carrito.set([]);
    this.descuentoVenta.set(0);
    this.descuentoActivo.set(false);
    this.showSuspenderVenta.set(false);
    this.toast.success('Venta suspendida');
  }

  protected retomarVentaSuspendida(venta: VentaSuspendida): void {
    this.showVentasSuspendidas.set(false);
    if (this.carrito().length > 0) {
      this.ventaSuspendidaARetomar.set(venta);
      this.showConfirmarRetomar.set(true);
      return;
    }
    this.aplicarVentaSuspendida(venta);
  }

  protected confirmarRetomarVenta(): void {
    const venta = this.ventaSuspendidaARetomar();
    if (!venta) return;
    this.aplicarVentaSuspendida(venta);
    this.showConfirmarRetomar.set(false);
    this.ventaSuspendidaARetomar.set(null);
  }

  private aplicarVentaSuspendida(venta: VentaSuspendida): void {
    this.ventasSuspendidasService.retomar(venta.id);
    this.carrito.set(venta.carrito);
    this.descuentoVenta.set(venta.descuentoVenta);
    this.descuentoActivo.set(venta.descuentoVenta > 0);
    this.toast.success('Venta retomada');
  }

  protected eliminarVentaSuspendida(venta: VentaSuspendida): void {
    this.ventasSuspendidasService.eliminar(venta.id);
    this.toast.success('Venta suspendida eliminada');
  }

  protected totalVentaSuspendida(venta: VentaSuspendida): number {
    const subtotal = venta.carrito.reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0);
    const impuesto = venta.carrito.reduce(
      (sum, l) => sum + l.precioUnitario * l.cantidad * (l.porcentajeImpuesto / 100),
      0,
    );
    return Math.max(0, subtotal + impuesto - venta.descuentoVenta);
  }

  protected abrirCobro(): void {
    if (this.carrito().length === 0) return;
    this.tipoVenta.set('CONTADO');
    this.descuentoActivo.set(false);
    this.descuentoVenta.set(0);
    this.pagos.set([{ metodoPago: 'EFECTIVO', monto: this.total() }]);
    this.clienteId.set('');
    this.numeroCuotas.set(1);
    this.fechaPrimerPago.set(this.calcularFechaPorDefecto());
    this.verificacionCredito.set(null);
    this.clienteVentaActivo.set(false);
    this.reiniciarClienteVenta();
    this.showCobro.set(true);
  }

  protected alternarClienteVenta(activo: boolean): void {
    this.clienteVentaActivo.set(activo);
    if (!activo) {
      this.reiniciarClienteVenta();
    }
  }

  private reiniciarClienteVenta(): void {
    this.clienteVentaEtapa.set('telefono');
    this.clienteVentaTelefono.set('');
    this.clienteVentaSeleccionado.set(null);
    this.nuevoClienteNombre.set('');
  }

  /** Busca en los clientes ya cargados (sin llamada al backend) si el teléfono ya está registrado. */
  protected buscarClientePorTelefono(): void {
    const telefono = this.clienteVentaTelefono().trim();
    if (!telefono) {
      this.toast.error('Ingresa un teléfono');
      return;
    }
    const encontrado = this.clientes().find((c) => c.telefono === telefono);
    if (encontrado) {
      this.clienteExistenteEncontrado.set(encontrado);
      this.showClienteExistente.set(true);
      return;
    }
    this.clienteVentaEtapa.set('nuevo');
  }

  protected confirmarClienteExistente(): void {
    const cliente = this.clienteExistenteEncontrado();
    if (!cliente) return;
    this.clienteVentaSeleccionado.set(cliente);
    this.clienteVentaEtapa.set('seleccionado');
    this.showClienteExistente.set(false);
    this.clienteExistenteEncontrado.set(null);
  }

  protected cancelarClienteExistente(): void {
    this.showClienteExistente.set(false);
    this.clienteExistenteEncontrado.set(null);
    this.clienteVentaTelefono.set('');
  }

  /** Vuelve a pedir el teléfono — para buscar otro cliente distinto al ya seleccionado/en creación. */
  protected cambiarClienteVenta(): void {
    this.reiniciarClienteVenta();
  }

  private calcularFechaPorDefecto(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().slice(0, 10);
  }

  protected seleccionarTipoVenta(tipo: 'CONTADO' | 'CREDITO'): void {
    this.tipoVenta.set(tipo);
    this.verificacionCredito.set(null);
    if (tipo === 'CREDITO' && this.clienteId()) {
      this.verificarCupoCliente();
    }
  }

  protected onClienteChange(clienteId: string): void {
    this.clienteId.set(clienteId);
    this.verificarCupoCliente();
  }

  private verificarCupoCliente(): void {
    const clienteId = this.clienteId();
    if (!clienteId) {
      this.verificacionCredito.set(null);
      return;
    }
    this.verificandoCredito.set(true);
    this.clientesService.verificarCredito(clienteId, this.total()).subscribe({
      next: (resultado) => {
        this.verificandoCredito.set(false);
        this.verificacionCredito.set(resultado);
      },
      error: () => {
        this.verificandoCredito.set(false);
        this.toast.error('No se pudo verificar el cupo del cliente');
      },
    });
  }

  protected actualizarDescuentoVenta(monto: number): void {
    const maximo = this.subtotal() + this.impuesto();
    this.descuentoVenta.set(Math.min(Math.max(0, monto), maximo));
  }

  protected alternarDescuentoActivo(activo: boolean): void {
    this.descuentoActivo.set(activo);
    if (!activo) {
      this.actualizarDescuentoVenta(0);
    }
  }

  protected agregarPago(): void {
    this.pagos.update((lineas) => [
      ...lineas,
      { metodoPago: 'TARJETA', monto: this.faltante() },
    ]);
  }

  protected actualizarMetodoPago(index: number, metodoPago: MetodoPago): void {
    this.pagos.update((lineas) => lineas.map((l, i) => (i === index ? { ...l, metodoPago } : l)));
  }

  protected actualizarMontoPago(index: number, monto: number): void {
    this.pagos.update((lineas) => lineas.map((l, i) => (i === index ? { ...l, monto } : l)));
  }

  protected quitarPago(index: number): void {
    if (this.pagos().length <= 1) return;
    this.pagos.update((lineas) => lineas.filter((_, i) => i !== index));
  }

  /** El backend espera que los pagos sumen exactamente el total — el efectivo va por lo aplicado, no lo entregado. */
  private pagosParaEnviar(): { metodoPago: MetodoPago; monto: number }[] {
    const otros = this.pagos()
      .filter((p) => p.metodoPago !== 'EFECTIVO')
      .map((p) => ({ metodoPago: p.metodoPago, monto: p.monto }));
    if (!this.tieneEfectivo()) return otros;
    return [...otros, { metodoPago: 'EFECTIVO' as MetodoPago, monto: this.efectivoAplicado() }];
  }

  protected confirmarCobro(): void {
    const sucursal = this.sucursal();
    const bodega = this.bodega();
    const turno = this.turno();
    if (!sucursal || !bodega || !turno) {
      this.toast.error('Falta configurar sucursal, bodega o turno de caja');
      return;
    }

    const esCredito = this.tipoVenta() === 'CREDITO';

    if (!esCredito) {
      if (this.faltante() > 1) {
        this.toast.error(`Falta ${this.formatMoney(this.faltante())} por pagar`);
        return;
      }
    } else {
      if (!this.clienteId()) {
        this.toast.error('Selecciona un cliente para la venta a crédito');
        return;
      }
      if (this.numeroCuotas() < 1) {
        this.toast.error('El número de cuotas debe ser al menos 1');
        return;
      }
      if (this.verificacionCredito() && !this.verificacionCredito()!.aprobado) {
        this.toast.error(this.verificacionCredito()!.mensaje ?? 'Crédito no aprobado');
        return;
      }
    }

    if (!esCredito && this.clienteVentaActivo()) {
      const etapa = this.clienteVentaEtapa();
      if (etapa === 'seleccionado' && this.clienteVentaSeleccionado()) {
        const cliente = this.clienteVentaSeleccionado()!;
        this.registrarVenta(sucursal.id, bodega.id, esCredito, cliente.id, cliente.nombre);
        return;
      }
      if (etapa === 'nuevo') {
        if (!this.nuevoClienteNombre().trim()) {
          this.toast.error('Ingresa el nombre del nuevo cliente');
          return;
        }
        this.creandoClienteVenta.set(true);
        this.clientesService
          .create({ nombre: this.nuevoClienteNombre().trim(), telefono: this.clienteVentaTelefono().trim() })
          .subscribe({
            next: (cliente) => {
              this.creandoClienteVenta.set(false);
              this.registrarVenta(sucursal.id, bodega.id, esCredito, cliente.id, cliente.nombre);
            },
            error: (err) => {
              this.creandoClienteVenta.set(false);
              this.toast.error(err.error?.message ?? 'No se pudo crear el cliente');
            },
          });
        return;
      }
      this.toast.error('Busca o crea el cliente para la venta');
      return;
    }

    this.registrarVenta(sucursal.id, bodega.id, esCredito);
  }

  private registrarVenta(
    sucursalId: string,
    bodegaId: string,
    esCredito: boolean,
    clienteContadoId?: string,
    nombreClienteContado?: string,
  ): void {
    this.procesando.set(true);
    this.ventasService
      .create({
        sucursalId,
        bodegaId,
        items: this.carrito().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        descuentoVenta: this.descuentoVenta() || undefined,
        ...(esCredito
          ? {
              tipoVenta: 'CREDITO' as const,
              clienteId: this.clienteId(),
              numeroCuotas: this.numeroCuotas(),
              fechaPrimerPago: this.fechaPrimerPago(),
            }
          : {
              pagos: this.pagosParaEnviar(),
              clienteId: clienteContadoId,
              nombreCliente: nombreClienteContado,
            }),
      })
      .subscribe({
        next: (venta) => {
          this.procesando.set(false);
          this.showCobro.set(false);
          this.ventaCompletada.set(venta);
          this.carrito.set([]);
          this.toast.success('Venta registrada');
        },
        error: (err) => {
          this.procesando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo registrar la venta');
        },
      });
  }

  protected nuevaVenta(): void {
    this.ventaCompletada.set(null);
  }

  protected confirmarCerrarCaja(): void {
    this.router.navigate(['/dashboard'], { queryParams: { cerrarTurno: '1' } });
  }

  protected confirmarPausarCaja(): void {
    this.showConfirmarPausarCaja.set(false);
    this.auth.pausarCaja();
  }

  protected imprimirFactura(venta: Venta): void {
    this.imprimiendo.set(true);
    this.printAgent.imprimirTicket('', venta).subscribe((result) => {
      if (!result.impreso) {
        this.toast.info('Agente de impresión no disponible — abriendo el recibo en el navegador');
        this.printAgent.imprimirReciboNavegador('', venta);
      }
      this.imprimiendo.set(false);
      this.nuevaVenta();
    });
  }

  protected imageUrl(imagenUrl?: string | null): string | null {
    if (!imagenUrl) return null;
    return `${environment.assetsUrl}${imagenUrl}`;
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      value,
    );
  }
}
