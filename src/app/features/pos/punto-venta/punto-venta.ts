import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Thumbnail } from '../../../shared/ui/atoms/thumbnail/thumbnail';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { SucursalContextService } from '../../../core/services/sucursal-context.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { CajaService } from '../../../core/services/caja.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { VentasService } from '../../../core/services/ventas.service';
import { MetodosPagoService } from '../../../core/services/metodos-pago.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { CuponesService } from '../../../core/services/cupones.service';
import { PrintAgentService } from '../../../core/services/print-agent.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  VentasSuspendidasService,
  LineaCarritoSuspendida,
} from '../../../core/services/ventas-suspendidas.service';
import { ToastService } from '../../../core/services/toast.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { Producto } from '../../../core/models/producto.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Bodega } from '../../../core/models/bodega.model';
import { TurnoCaja } from '../../../core/models/caja.model';
import { Venta } from '../../../core/models/venta.model';
import { MetodoPago } from '../../../core/models/metodo-pago.model';
import { Cliente, VerificarCreditoResponse } from '../../../core/models/cliente.model';
import { CreateDireccionClientePayload, DireccionCliente } from '../../../core/models/direccion-cliente.model';
import { PrecioVigente } from '../../../core/models/promocion.model';
import { PanelDomiciliosPos } from './panel-domicilios-pos/panel-domicilios-pos';
import { TurnoCajaPos } from './turno-caja-pos/turno-caja-pos';
import { VentasSuspendidasPos } from './ventas-suspendidas-pos/ventas-suspendidas-pos';
import { CatalogoGridPos } from './catalogo-grid-pos/catalogo-grid-pos';
import { calcularImpuesto, calcularSubtotal, formatMoney, imageUrl } from './pos-shared.util';

/** Sentinel para "cargar una dirección nueva" en el selector — nunca colisiona con un UUID real. */
const NUEVA_DIRECCION = '__nueva__';

interface LineaPago {
  metodoPago: string;
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

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Icon,
    Badge,
    Thumbnail,
    SearchBar,
    EmptyState,
    FormField,
    Input,
    Select,
    Switch,
    Modal,
    FormsModule,
    PanelDomiciliosPos,
    TurnoCajaPos,
    VentasSuspendidasPos,
    CatalogoGridPos,
  ],
  templateUrl: './punto-venta.html',
  styleUrl: './punto-venta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuntoVenta {
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly bodegasService = inject(BodegasService);
  private readonly cajaService = inject(CajaService);
  private readonly inventarioService = inject(InventarioService);
  private readonly ventasService = inject(VentasService);
  private readonly metodosPagoService = inject(MetodosPagoService);
  private readonly clientesService = inject(ClientesService);
  private readonly cuponesService = inject(CuponesService);
  protected readonly printAgent = inject(PrintAgentService);
  protected readonly auth = inject(AuthService);
  private readonly ventasSuspendidasService = inject(VentasSuspendidasService);
  private readonly toast = inject(ToastService);
  private readonly alertasService = inject(AlertasService);
  private readonly route = inject(ActivatedRoute);

  /** Referencia al buscador para devolverle el foco tras cada acción — así el lector de código de barras (que solo "escribe" donde esté el cursor) siempre tiene dónde caer. */
  private readonly buscador = viewChild<SearchBar>('buscador');
  /**
   * El botón "Suspender venta" vive en el carrito (acá), pero el feature completo lo dueña
   * `VentasSuspendidasPos`. La variable de plantilla se llama distinto a esta propiedad a
   * propósito — si coinciden, Angular resuelve el nombre dentro del template como la referencia
   * local (la instancia del componente, no invocable) y no como esta señal.
   */
  protected readonly suspendidasPanel = viewChild<VentasSuspendidasPos>('panelVentasSuspendidas');

  protected readonly loading = signal(true);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly filtroCategoriaId = signal('');
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly turno = signal<TurnoCaja | null>(null);
  protected readonly stockPorProducto = signal<Map<string, number>>(new Map());
  /** Promociones automáticas vigentes por producto en la bodega activa — ver efecto de carga en el constructor. */
  protected readonly preciosVigentes = signal<Map<string, PrecioVigente>>(new Map());

  /** Sucursal activa: la fija del usuario (cajero) o la elegida por un admin — ver `SucursalContextService`. */
  protected readonly sucursal = computed<Sucursal | null>(
    () =>
      this.sucursales().find((s) => s.id === this.sucursalContext.sucursalId()) ??
      this.sucursales()[0] ??
      null,
  );
  protected readonly bodega = computed<Bodega | null>(
    () =>
      this.bodegas().find((b) => b.sucursalId === this.sucursal()?.id) ?? this.bodegas()[0] ?? null,
  );

  protected readonly showAbrirTurno = signal(false);
  protected readonly montoInicialTurno = signal<number>(100000);
  protected readonly abriendoTurno = signal(false);

  protected readonly search = signal('');
  protected readonly carrito = signal<LineaCarrito[]>([]);
  protected readonly procesando = signal(false);

  protected readonly showCobro = signal(false);
  protected readonly pagos = signal<LineaPago[]>([]);
  protected readonly descuentoActivo = signal(false);
  protected readonly descuentoVenta = signal<number>(0);
  protected readonly pinAutorizacionDescuento = signal<string>('');
  /** Si el cajero actual ya puede eliminar/cancelar ventas, no necesita aprobación — mismo permiso que usa `cancelar()` de step-up. */
  protected readonly requierePinDescuento = computed(() => !this.auth.tienePermiso('VENTAS', 'ELIMINAR'));
  protected readonly cuponActivo = signal(false);
  protected readonly codigoCupon = signal<string>('');
  protected readonly cuponAplicado = signal<{ codigo: string; descuento: number } | null>(null);
  protected readonly validandoCupon = signal(false);
  protected readonly descuentoCupon = computed(() => this.cuponAplicado()?.descuento ?? 0);
  protected readonly metodosPago = signal<MetodoPago[]>([]);
  /** Nombre del método marcado esEfectivo en el catálogo del negocio — puede no haber ninguno. */
  protected readonly nombreEfectivo = computed(() => this.metodosPago().find((m) => m.esEfectivo)?.nombre);

  protected readonly tipoVenta = signal<'CONTADO' | 'CREDITO'>('CONTADO');
  protected readonly tipoComprobante = signal<'RECIBO' | 'FACTURA'>('RECIBO');
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

  /**
   * Domicilio: necesita un Cliente real (las direcciones dependen de él), sin
   * importar si viene del camino CRÉDITO (`clienteId`) o del switch opcional
   * de CONTADO (`clienteVentaSeleccionado`) — ver `alternarDomicilio`.
   */
  protected readonly clienteResueltoId = computed<string | null>(() =>
    this.tipoVenta() === 'CREDITO' ? this.clienteId() || null : (this.clienteVentaSeleccionado()?.id ?? null),
  );
  protected readonly domicilioActivo = signal(false);
  protected readonly showDireccionModal = signal(false);
  protected readonly cargandoDirecciones = signal(false);
  protected readonly direccionesCliente = signal<DireccionCliente[]>([]);
  protected readonly direccionSeleccionadaId = signal<string>('');
  protected readonly direccionElegida = signal<DireccionCliente | null>(null);
  protected readonly guardandoDireccion = signal(false);
  protected readonly nuevaDireccion = signal<CreateDireccionClientePayload>({ direccionLinea1: '' });
  protected readonly NUEVA_DIRECCION = NUEVA_DIRECCION;
  /** `?domicilio=1` en la URL — prende el switch solo apenas se resuelva un cliente (ver Domicilios → "Nuevo domicilio"). */
  private readonly domicilioSolicitadoPorQuery = signal(false);

  protected readonly ventaCompletada = signal<Venta | null>(null);
  /** Solo lectura desde el template — se muestra en el modal "Venta completada" cuando hubo devuelta en efectivo. */
  protected readonly cambioVentaCompletada = signal(0);
  protected readonly imprimiendo = signal(false);

  /** Categorías con cada sub-categoría justo debajo de su padre — mismo patrón que `productos-list`. */
  protected readonly categoriasOrdenadas = computed(() => {
    const todas = this.categorias();
    const principales = todas.filter((c) => !c.categoriaPadreId);
    const resultado: Categoria[] = [];
    for (const principal of principales) {
      resultado.push(principal);
      resultado.push(...todas.filter((c) => c.categoriaPadreId === principal.id));
    }
    return resultado;
  });

  /**
   * Cada sede está anclada a una bodega — el punto de venta solo debe ofrecer lo que esa bodega
   * realmente tiene registrado, ni más ni menos. `stockPorProducto` (armado al cambiar de bodega)
   * solo trae entradas para productos con fila de inventario ahí, así que `.has(id)` ya es
   * exactamente "pertenece al surtido de esta bodega" — no hace falta pedirle nada nuevo al
   * backend. Un producto con fila en 0 sí pasa este filtro (se ve marcado "Sin stock" en
   * `ProductCard`); uno sin ninguna fila, no.
   */
  protected readonly productosDeBodega = computed(() =>
    this.productos().filter((p) => this.stockPorProducto().has(p.id)),
  );

  protected readonly productosFiltrados = computed(() => {
    const term = this.search().toLowerCase().trim();
    const categoriaId = this.filtroCategoriaId();
    return this.productosDeBodega().filter((p) => {
      if (categoriaId && !p.categorias.some((c) => c.id === categoriaId)) return false;
      if (!term) return true;
      return (
        p.nombre.toLowerCase().includes(term) ||
        p.codigoBarras?.includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    });
  });

  protected readonly subtotal = computed(() => calcularSubtotal(this.carrito()));
  protected readonly impuesto = computed(() => calcularImpuesto(this.carrito()));
  protected readonly total = computed(() =>
    Math.max(0, this.subtotal() + this.impuesto() - this.descuentoVenta() - this.descuentoCupon()),
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
      .filter((p) => p.metodoPago === this.nombreEfectivo())
      .reduce((sum, p) => sum + p.monto, 0),
  );
  protected readonly montoOtrosMetodos = computed(() =>
    this.pagos()
      .filter((p) => p.metodoPago !== this.nombreEfectivo())
      .reduce((sum, p) => sum + p.monto, 0),
  );
  protected readonly efectivoAplicado = computed(() =>
    Math.min(this.efectivoTendido(), Math.max(0, this.total() - this.montoOtrosMetodos())),
  );
  protected readonly cambio = computed(() => Math.max(0, this.efectivoTendido() - this.efectivoAplicado()));
  protected readonly totalPagado = computed(() => this.montoOtrosMetodos() + this.efectivoAplicado());
  protected readonly faltante = computed(() => Math.max(0, this.total() - this.totalPagado()));
  protected readonly tieneEfectivo = computed(() => this.pagos().some((p) => p.metodoPago === this.nombreEfectivo()));

  /** Lo que le queda por cubrir a la fila de efectivo antes de que el cajero escriba nada en ella — base para sugerir montos rápidos. */
  protected readonly montoPendienteEfectivo = computed(() => Math.max(0, this.total() - this.montoOtrosMetodos()));

  constructor() {
    this.load();
    this.domicilioSolicitadoPorQuery.set(this.route.snapshot.queryParamMap.get('domicilio') === '1');

    /** Apenas se resuelve un cliente real durante una sesión "Nuevo domicilio" (desde /domicilios), prende el switch solo. */
    effect(() => {
      if (
        this.clienteResueltoId() &&
        this.domicilioSolicitadoPorQuery() &&
        !this.domicilioActivo() &&
        this.showCobro()
      ) {
        this.alternarDomicilio(true);
      }
    });

    /** Turno y stock dependen de la sucursal/bodega activa — se recargan solos cuando cambian. */
    effect(() => {
      const sucursalId = this.sucursal()?.id;
      if (!sucursalId) {
        this.turno.set(null);
        return;
      }
      this.cajaService.findAllTurnos(sucursalId).subscribe({
        next: (turnos) => this.turno.set(turnos.find((t) => t.estado === 'ABIERTO') ?? null),
        error: () => this.turno.set(null),
      });
    });

    /** Reenfoca el buscador cada vez que vuelve a ser el elemento "de turno" (recién abierta la caja, o al cerrarse el modal de cobro) — sin esto, un clic en cualquier otro lado deja al lector de código de barras escribiendo en el vacío. */
    effect(() => {
      if (this.turno() && !this.showCobro()) {
        setTimeout(() => this.buscador()?.focus());
      }
    });

    effect(() => {
      const bodegaId = this.bodega()?.id;
      if (!bodegaId) {
        this.stockPorProducto.set(new Map());
        return;
      }
      this.inventarioService.findAll(bodegaId).subscribe({
        next: (items) => {
          const mapa = new Map<string, number>();
          for (const item of items) mapa.set(item.productoId, Number(item.cantidad));
          this.stockPorProducto.set(mapa);
        },
      });
    });

    /** Promociones automáticas vigentes para la sucursal/bodega activa — se recargan solas al cambiar, igual que el stock. */
    effect(() => {
      const sucursalId = this.sucursal()?.id;
      const bodegaId = this.bodega()?.id;
      if (!sucursalId || !bodegaId) {
        this.preciosVigentes.set(new Map());
        return;
      }
      this.cuponesService.preciosVigentes(sucursalId, bodegaId).subscribe({
        next: (precios) => {
          this.preciosVigentes.set(new Map(precios.map((p) => [p.productoId, p])));
        },
        error: () => this.preciosVigentes.set(new Map()),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      productos: this.productosService.findAll(),
      categorias: this.categoriasService.findAll(),
      sucursales: this.sucursalesService.findAll(),
      bodegas: this.bodegasService.findAll(),
      clientes: this.clientesService.findAll(),
      metodosPago: this.metodosPagoService.findAll(),
    }).subscribe({
      next: ({ productos, categorias, sucursales, bodegas, clientes, metodosPago }) => {
        this.productos.set(productos);
        this.categorias.set(categorias);
        this.sucursales.set(sucursales);
        this.bodegas.set(bodegas);
        this.clientes.set(clientes);
        this.metodosPago.set(metodosPago);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el punto de venta');
      },
    });
  }

  protected cambiarSucursal(sucursalId: string): void {
    this.sucursalContext.elegir(sucursalId);
  }

  /**
   * Sin fila de inventario para esta bodega = 0 disponible, no "sin límite". Defensa en
   * profundidad: `productosDeBodega`/`onScanSubmit` ya evitan que esto se alcance en el uso
   * normal, pero una línea que quedó en el carrito de ANTES de cambiar de bodega sigue pasando
   * por acá — sin este `?? 0` (antes `?? null`), el guard de `incrementar()` se saltaba entero.
   */
  protected stockDe(productoId: string): number {
    return this.stockPorProducto().get(productoId) ?? 0;
  }

  protected abrirTurnoDesdePos(): void {
    const sucursalId = this.sucursal()?.id;
    if (!sucursalId) {
      this.toast.error('No hay una sucursal seleccionada');
      return;
    }
    this.abriendoTurno.set(true);
    this.cajaService.abrirTurno(sucursalId, this.montoInicialTurno()).subscribe({
      next: (turno) => {
        this.abriendoTurno.set(false);
        this.showAbrirTurno.set(false);
        this.turno.set(turno);
        this.toast.success('Turno de caja abierto');
      },
      error: (err) => {
        this.abriendoTurno.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo abrir el turno');
      },
    });
  }

  protected agregarAlCarrito(producto: Producto): void {
    const stock = this.stockDe(producto.id);
    const enCarrito = this.carrito().find((l) => l.productoId === producto.id)?.cantidad ?? 0;
    if (enCarrito + 1 > stock) {
      this.toast.error(stock <= 0 ? `"${producto.nombre}" está agotado` : `Solo queda ${stock} disponible(s) de "${producto.nombre}"`);
      return;
    }
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
          // Si hay una promoción automática vigente, el carrito ya refleja el precio con descuento —
          // el backend igual lo recalcula de forma autoritativa al confirmar la venta.
          precioUnitario: this.preciosVigentes().get(producto.id)?.precio ?? producto.precioVenta,
          costoUnitario: producto.costo,
          porcentajeImpuesto: producto.porcentajeImpuesto,
        },
      ];
    });
    this.buscador()?.focus();
  }

  /**
   * La sesión expiró (JWT vencido, 12h) mientras había una venta en curso — `auth.interceptor.ts`
   * dispara este evento antes de redirigir a /login. Sin esto, el carrito desaparecía sin rastro
   * al perder la pantalla; ahora queda guardado como cualquier otra venta suspendida, recuperable
   * al volver a loguearse. El toast se ve igual en la pantalla de login (`ds-toast-container`
   * también está montado en `AuthLayout`).
   */
  @HostListener('window:pos:sesion-expirada')
  protected onSesionExpirada(): void {
    if (this.carrito().length === 0) return;
    this.ventasSuspendidasService.suspender(
      this.carrito(),
      this.descuentoVenta(),
      'Auto-guardada (sesión expirada)',
    );
    this.toast.info('Tu sesión expiró — la venta en curso quedó guardada en Ventas suspendidas.');
  }

  /** Buffer del escaneo global (ver `onKeydownGlobal`) — bookkeeping puro, no es estado de UI. */
  private bufferEscaneoGlobal = '';
  private ultimoTecleoGlobal = 0;

  /**
   * Un lector de código de barras USB escribe cada carácter en ~1-20ms; una persona nunca teclea así
   * de rápido. Usamos esa diferencia de velocidad para detectar un escaneo esté o no el foco puesto
   * en el buscador — así el cajero no tiene que clickearlo antes de cada lectura. Se ignora mientras
   * hay un modal abierto (no queremos que un escaneo agregue algo al carrito por detrás de un diálogo)
   * o si el foco está en otro campo de texto donde el cajero está escribiendo a propósito.
   */
  @HostListener('document:keydown', ['$event'])
  protected onKeydownGlobal(event: KeyboardEvent): void {
    if (!this.turno()) return;
    if (document.querySelector('ds-modal')) return;

    const target = event.target as HTMLElement;
    if (target.closest('ds-search-bar')) return; // el propio buscador ya maneja su Enter
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const ahora = Date.now();
    const esVelocidadDeEscaner = ahora - this.ultimoTecleoGlobal < 40;
    this.ultimoTecleoGlobal = ahora;

    if (event.key === 'Enter') {
      const codigo = this.bufferEscaneoGlobal;
      this.bufferEscaneoGlobal = '';
      if (esVelocidadDeEscaner && codigo.length >= 4) {
        event.preventDefault();
        this.onScanSubmit(codigo);
      }
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.bufferEscaneoGlobal = esVelocidadDeEscaner ? this.bufferEscaneoGlobal + event.key : event.key;
    }
  }

  protected onScanSubmit(codigo: string): void {
    const producto = this.productosDeBodega().find((p) => p.codigoBarras === codigo || p.sku === codigo);
    if (!producto) {
      this.toast.error(`Sin coincidencias para "${codigo}"`);
      this.buscador()?.focus();
      return;
    }
    this.agregarAlCarrito(producto);
    this.search.set('');
  }

  protected incrementar(productoId: string): void {
    const stock = this.stockDe(productoId);
    const linea = this.carrito().find((l) => l.productoId === productoId);
    if (linea && linea.cantidad + 1 > stock) {
      this.toast.error(stock <= 0 ? `"${linea.nombre}" está agotado` : `Solo queda ${stock} disponible(s) de "${linea.nombre}"`);
      return;
    }
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

  /** El propio carrito se suspendió — `VentasSuspendidasPos` ya lo guardó, acá solo se vacía. */
  protected onVentaSuspendida(): void {
    this.carrito.set([]);
    this.descuentoVenta.set(0);
    this.descuentoActivo.set(false);
    this.alternarCupon(false);
  }

  protected onVentaRetomada(evento: { carrito: LineaCarritoSuspendida[]; descuentoVenta: number }): void {
    this.carrito.set(evento.carrito);
    this.descuentoVenta.set(evento.descuentoVenta);
    this.descuentoActivo.set(evento.descuentoVenta > 0);
  }

  protected abrirCobro(): void {
    if (this.carrito().length === 0) return;
    this.tipoVenta.set('CONTADO');
    this.tipoComprobante.set(this.sucursal()?.tipoComprobanteDefecto ?? 'RECIBO');
    this.descuentoActivo.set(false);
    this.descuentoVenta.set(0);
    this.pinAutorizacionDescuento.set('');
    this.alternarCupon(false);
    this.pagos.set([{ metodoPago: this.nombreEfectivo() ?? this.metodosPago()[0]?.nombre ?? '', monto: this.total() }]);
    this.clienteId.set('');
    this.numeroCuotas.set(1);
    this.fechaPrimerPago.set(this.calcularFechaPorDefecto());
    this.verificacionCredito.set(null);
    this.clienteVentaActivo.set(false);
    this.reiniciarClienteVenta();
    this.reiniciarDomicilio();
    this.showCobro.set(true);
  }

  protected alternarClienteVenta(activo: boolean): void {
    this.clienteVentaActivo.set(activo);
    if (!activo) {
      this.reiniciarClienteVenta();
      this.reiniciarDomicilio();
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
    this.reiniciarDomicilio();
  }

  /**
   * Crea el cliente nuevo de una vez (no al confirmar el pago) — así queda
   * visible como "seleccionado" antes de cobrar, y sobre todo, la lista de
   * `clientes()` en memoria se actualiza al toque: si no se hacía esto, una
   * 2ª venta en la misma sesión de la página no encontraba el cliente recién
   * creado al buscar por teléfono (la lista solo se cargaba una vez al abrir
   * el punto de venta) y el backend terminaba rechazando el duplicado al
   * confirmar el pago.
   */
  protected guardarClienteVenta(): void {
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
          this.clientes.update((lista) => [...lista, cliente]);
          this.clienteVentaSeleccionado.set(cliente);
          this.clienteVentaEtapa.set('seleccionado');
          this.toast.success('Cliente creado');
        },
        error: (err) => {
          this.creandoClienteVenta.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo crear el cliente');
        },
      });
  }

  // ---------- Domicilio ----------

  private reiniciarDomicilio(): void {
    this.domicilioActivo.set(false);
    this.direccionElegida.set(null);
    this.direccionSeleccionadaId.set('');
    this.direccionesCliente.set([]);
  }

  protected alternarDomicilio(activo: boolean): void {
    if (!activo) {
      this.reiniciarDomicilio();
      return;
    }
    if (!this.clienteResueltoId()) {
      this.toast.error('Seleccioná un cliente para poder domiciliar');
      return;
    }
    this.abrirModalDireccion();
  }

  protected abrirModalDireccion(): void {
    const clienteId = this.clienteResueltoId();
    if (!clienteId) return;

    this.direccionSeleccionadaId.set(this.direccionElegida()?.id ?? '');
    this.nuevaDireccion.set({ direccionLinea1: '' });
    this.cargandoDirecciones.set(true);
    this.clientesService.direcciones(clienteId).subscribe({
      next: (direcciones) => {
        this.cargandoDirecciones.set(false);
        this.direccionesCliente.set(direcciones);
        if (!this.direccionSeleccionadaId()) {
          const predeterminada = direcciones.find((d) => d.predeterminada);
          if (predeterminada) this.direccionSeleccionadaId.set(predeterminada.id);
        }
      },
      error: () => {
        this.cargandoDirecciones.set(false);
        this.toast.error('No se pudieron cargar las direcciones del cliente');
      },
    });
    this.showDireccionModal.set(true);
  }

  protected actualizarNuevaDireccion(cambios: Partial<CreateDireccionClientePayload>): void {
    this.nuevaDireccion.update((d) => ({ ...d, ...cambios }));
  }

  protected cerrarModalDireccion(): void {
    this.showDireccionModal.set(false);
    if (!this.direccionElegida()) {
      this.domicilioActivo.set(false);
    }
  }

  protected confirmarDireccion(): void {
    const seleccion = this.direccionSeleccionadaId();
    if (!seleccion) {
      this.toast.error('Elegí una dirección');
      return;
    }

    if (seleccion === NUEVA_DIRECCION) {
      if (!this.nuevaDireccion().direccionLinea1.trim()) {
        this.toast.error('Ingresá la dirección de entrega');
        return;
      }
      const clienteId = this.clienteResueltoId();
      if (!clienteId) return;
      this.guardandoDireccion.set(true);
      this.clientesService.agregarDireccion(clienteId, this.nuevaDireccion()).subscribe({
        next: (direccion) => {
          this.guardandoDireccion.set(false);
          this.direccionesCliente.update((lista) => [...lista, direccion]);
          this.direccionElegida.set(direccion);
          this.domicilioActivo.set(true);
          this.showDireccionModal.set(false);
          this.toast.success('Dirección guardada');
        },
        error: (err) => {
          this.guardandoDireccion.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo guardar la dirección');
        },
      });
      return;
    }

    const direccion = this.direccionesCliente().find((d) => d.id === seleccion);
    if (!direccion) return;
    this.direccionElegida.set(direccion);
    this.domicilioActivo.set(true);
    this.showDireccionModal.set(false);
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

  protected seleccionarTipoComprobante(tipo: 'RECIBO' | 'FACTURA'): void {
    this.tipoComprobante.set(tipo);
  }

  protected onClienteChange(clienteId: string): void {
    this.clienteId.set(clienteId);
    this.reiniciarDomicilio();
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
      this.pinAutorizacionDescuento.set('');
    }
  }

  protected alternarCupon(activo: boolean): void {
    this.cuponActivo.set(activo);
    if (!activo) {
      this.quitarCupon();
    }
  }

  protected quitarCupon(): void {
    this.codigoCupon.set('');
    this.cuponAplicado.set(null);
  }

  /** Valida el código contra el carrito actual — el descuento real siempre se recalcula (y se redime) de forma autoritativa en el servidor al confirmar la venta. */
  protected redimirCupon(): void {
    const codigo = this.codigoCupon().trim();
    const sucursal = this.sucursal();
    const bodega = this.bodega();
    if (!codigo || !sucursal || !bodega) return;

    this.validandoCupon.set(true);
    this.cuponesService
      .validar({
        codigo,
        sucursalId: sucursal.id,
        bodegaId: bodega.id,
        items: this.carrito().map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
      })
      .subscribe({
        next: (resultado) => {
          this.validandoCupon.set(false);
          if (!resultado.valido) {
            this.cuponAplicado.set(null);
            this.toast.error(resultado.motivo ?? 'El cupón ingresado no es válido');
            return;
          }
          this.cuponAplicado.set({ codigo, descuento: resultado.descuento ?? 0 });
          this.toast.success('Cupón aplicado');
        },
        error: () => {
          this.validandoCupon.set(false);
          this.cuponAplicado.set(null);
          this.toast.error('El cupón ingresado no es válido');
        },
      });
  }

  protected agregarPago(): void {
    const metodoPorDefecto =
      this.metodosPago().find((m) => !m.esEfectivo)?.nombre ?? this.metodosPago()[0]?.nombre ?? '';
    this.pagos.update((lineas) => [
      ...lineas,
      { metodoPago: metodoPorDefecto, monto: this.faltante() },
    ]);
  }

  protected actualizarMetodoPago(index: number, metodoPago: string): void {
    this.pagos.update((lineas) => lineas.map((l, i) => (i === index ? { ...l, metodoPago } : l)));
  }

  protected actualizarMontoPago(index: number, monto: number): void {
    this.pagos.update((lineas) => lineas.map((l, i) => (i === index ? { ...l, monto } : l)));
  }

  /** Denominaciones de billete en COP, para sugerir montos "redondos" al cajero en vez de que tenga que teclear todo a mano. */
  private static readonly DENOMINACIONES = [2000, 5000, 10000, 20000, 50000, 100000];

  /** Monto exacto pendiente + hasta 2 redondeos hacia arriba a la denominación de billete más cercana — vacío si no falta nada por cubrir en efectivo. */
  protected montosRapidos(): number[] {
    const pendiente = this.montoPendienteEfectivo();
    if (pendiente <= 0) return [];
    const sugeridos = new Set<number>([pendiente]);
    for (const denominacion of PuntoVenta.DENOMINACIONES) {
      if (denominacion < pendiente) continue;
      sugeridos.add(Math.ceil(pendiente / denominacion) * denominacion);
      if (sugeridos.size >= 3) break;
    }
    return Array.from(sugeridos).sort((a, b) => a - b);
  }

  protected quitarPago(index: number): void {
    if (this.pagos().length <= 1) return;
    this.pagos.update((lineas) => lineas.filter((_, i) => i !== index));
  }

  /** El backend espera que los pagos sumen exactamente el total — el efectivo va por lo aplicado, no lo entregado. */
  private pagosParaEnviar(): { metodoPago: string; monto: number }[] {
    const otros = this.pagos()
      .filter((p) => p.metodoPago !== this.nombreEfectivo())
      .map((p) => ({ metodoPago: p.metodoPago, monto: p.monto }));
    if (!this.tieneEfectivo()) return otros;
    return [...otros, { metodoPago: this.nombreEfectivo()!, monto: this.efectivoAplicado() }];
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

    if (this.cuponActivo() && !this.cuponAplicado()) {
      this.toast.error('Redimí el cupón antes de confirmar la venta, o desactivá el switch');
      return;
    }

    if (this.descuentoActivo() && this.descuentoVenta() > 0 && this.requierePinDescuento()) {
      if (!/^\d{4,6}$/.test(this.pinAutorizacionDescuento())) {
        this.toast.error('Ingresá el PIN de un administrador para aplicar el descuento (4 a 6 dígitos)');
        return;
      }
    }

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
      this.toast.error(
        etapa === 'nuevo' ? 'Guarda el cliente antes de confirmar la compra' : 'Busca o crea el cliente para la venta',
      );
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
    const direccion = this.direccionElegida();
    // Se captura antes de limpiar el carrito — `cambio()` depende de `pagos()`/`total()`, que se resetean abajo.
    const cambioVenta = !esCredito ? this.cambio() : 0;
    this.procesando.set(true);
    this.ventasService
      .create({
        sucursalId,
        bodegaId,
        tipoComprobante: this.tipoComprobante(),
        items: this.carrito().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        descuentoVenta: this.descuentoVenta() || undefined,
        pinAutorizacionDescuento:
          this.descuentoActivo() && this.descuentoVenta() > 0 ? this.pinAutorizacionDescuento() || undefined : undefined,
        cuponCodigo: this.cuponAplicado()?.codigo,
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
        ...(this.domicilioActivo() && direccion
          ? { domicilio: { direccionClienteId: direccion.id } }
          : {}),
      })
      .subscribe({
        next: (venta) => {
          this.procesando.set(false);
          this.showCobro.set(false);
          this.cambioVentaCompletada.set(cambioVenta);
          this.ventaCompletada.set(venta);
          this.descontarStockVendido(this.carrito());
          this.carrito.set([]);
          this.toast.success('Venta registrada');
          // El backend ya generó la alerta de stock bajo/agotado (si aplica) como parte
          // de crear la venta — se refresca acá para que la campana no espere el poll de 30s.
          this.alertasService.refrescarConteo().subscribe();
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

  /** El backend ya descontó el stock real — esto solo evita que la tarjeta del producto quede desactualizada hasta recargar. */
  private descontarStockVendido(lineas: LineaCarrito[]): void {
    this.stockPorProducto.update((mapa) => {
      const actualizado = new Map(mapa);
      for (const linea of lineas) {
        const actual = actualizado.get(linea.productoId);
        if (actual !== undefined) {
          actualizado.set(linea.productoId, Math.max(0, actual - linea.cantidad));
        }
      }
      return actualizado;
    });
  }

  protected imprimirFactura(venta: Venta): void {
    this.imprimiendo.set(true);
    const opciones = { cambio: this.cambioVentaCompletada() || undefined };
    this.ventasService.obtenerComprobante(venta.id).subscribe({
      next: (contenido) => {
        this.printAgent.imprimirTicket(contenido, opciones).subscribe((result) => {
          if (!result.impreso) {
            this.toast.info('Agente de impresión no disponible — abriendo el recibo en el navegador');
            this.printAgent.imprimirReciboNavegador(contenido, opciones);
          }
          this.imprimiendo.set(false);
          this.nuevaVenta();
        });
      },
      error: () => {
        this.imprimiendo.set(false);
        this.toast.error('No se pudo obtener el comprobante de esta venta');
      },
    });
  }

  protected readonly imageUrl = imageUrl;
  protected readonly formatMoney = formatMoney;
}
