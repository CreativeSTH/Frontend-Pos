import { Producto } from './producto.model';
import { Categoria } from './categoria.model';
import { Sucursal } from './sucursal.model';
import { Bodega } from './bodega.model';
import { Cliente } from './cliente.model';
import { MetodoPago } from './metodo-pago.model';
import { TurnoCaja } from './caja.model';
import { PrecioVigente } from './promocion.model';
import { EstadoFacturacion } from './politica-facturacion.model';

export interface ResolucionSinConexion {
  numero: string;
  prefijo: string;
  fechaInicio: string;
  fechaFin: string;
  rangoDesde: number;
  rangoHasta: number;
}

/** GET /ventas/sin-conexion/datos */
export interface DatosSinConexion {
  negocio: { nombre: string; nit?: string } | null;
  ambiente: 'SANDBOX' | 'PRODUCCION' | null;
  emisor: { razonSocial: string; nitConDv: string; direccion: string } | null;
  fabricanteSoftware: string;
  proveedorTecnologico: string;
  resolucion: (ResolucionSinConexion & { siguienteNumero: number }) | null;
}

/** Foto del POS que guarda el agente: todo lo necesario para vender e imprimir sin backend. */
export interface SnapshotPos {
  negocioId: string;
  sucursalId: string;
  bodegaId: string;
  usuarioId: string;
  productos: Producto[];
  categorias: Categoria[];
  sucursales: Sucursal[];
  bodegas: Bodega[];
  clientes: Cliente[];
  metodosPago: MetodoPago[];
  turno: TurnoCaja | null;
  stock: [string, number][];
  preciosVigentes: PrecioVigente[];
  estadoFacturacion: EstadoFacturacion | null;
  datos: DatosSinConexion;
  emisorSucursal: { direccion?: string; telefono?: string };
  mensajeCierre?: string;
  terminos?: string;
  guardadoEn?: string;
}

export interface BloqueNumeracion {
  desde: number;
  hasta: number;
  resolucion: ResolucionSinConexion;
}

export interface EstadoAgenteSinConexion {
  terminalId: string;
  codigoCaja: string;
  bloque: (BloqueNumeracion & { siguiente: number }) | null;
  disponibles: number;
  episodioAbierto: { id: string; inicio: string } | null;
  pendientes: number;
  errores: number;
}

export interface AsignacionSinConexion {
  idLocal: string;
  numero: number | null;
  prefijo: string | null;
  resolucion: ResolucionSinConexion | null;
  numeroProvisional: string | null;
  episodioId: string;
}

/** Lo que se sincroniza (espejo de VentaSinConexionDto del backend, sin idLocal/episodio/comprobante). */
export interface DatosVentaSinConexion {
  creadaEn: string;
  turnoId: string;
  sucursalId: string;
  bodegaId: string;
  tipoVenta: 'CONTADO' | 'CREDITO';
  clienteId?: string;
  nombreCliente?: string;
  items: { productoId: string; cantidad: number; precioUnitario: number; porcentajeImpuesto: number }[];
  pagos?: { metodoPago: string; monto: number }[];
  numeroCuotas?: number;
  fechaPrimerPago?: string;
}

export interface VentaPendiente extends DatosVentaSinConexion {
  idLocal: string;
  episodioId: string;
  asignacion: AsignacionSinConexion;
  error: string | null;
}

export interface ResultadoSincronizacion {
  idLocal: string;
  estado: 'OK' | 'DUPLICADA' | 'ERROR';
  ventaId?: string;
  mensaje?: string;
}
