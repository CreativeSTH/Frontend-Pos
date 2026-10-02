export type EstadoHabilitacion =
  | 'DATOS_NEGOCIO'
  | 'ESPERANDO_TRAMITE_DIAN'
  | 'RESOLUCION_CARGADA'
  | 'TESTSET_EN_CURSO'
  | 'HABILITADO'
  | 'ERROR';

export interface HabilitacionFacturacionElectronica {
  id: string;
  negocioId: string;
  estado: EstadoHabilitacion;
  razonSocial?: string;
  direccion?: string;
  ciudad?: string;
  ciudadCodigo?: string;
  departamentoCodigo?: string;
  useAlegraCertificate: boolean;
  resolucionNumero?: string;
  governmentTestSetId?: string;
  errorMensaje?: string;
  ambiente: 'SANDBOX' | 'PRODUCCION';
  esHabilitacionDePrueba: boolean;
}

export interface DatosNegocioPayload {
  razonSocial: string;
  /** Sin dígito de verificación ni puntos/guiones — obligatorio para facturar, aunque en /mi-negocio sea opcional. */
  nit: string;
  /** Alegra lo exige como dato de la compañía — obligatorio para facturar. */
  email: string;
  direccion: string;
  /** Nombre del municipio, solo para mostrar — la validación real la hace ciudadCodigo. */
  ciudadNombre: string;
  /** Código DIVIPOLA del municipio (5 dígitos) — Alegra lo valida contra un enum estricto, no nombres libres. */
  ciudadCodigo: string;
  /** Código DIVIPOLA del departamento (2 dígitos), derivado del municipio elegido. */
  departamentoCodigo: string;
  useAlegraCertificate: boolean;
  certificadoPfxBase64?: string;
  certificadoPassword?: string;
}

export interface ResolucionPayload {
  numero: string;
  prefijo: string;
  fechaInicio: string;
  fechaFin: string;
  rangoDesde: number;
  rangoHasta: number;
  technicalKey: string;
  /** TestSetId emitido por la DIAN en su portal de Habilitación (Paso 2 del trámite) — no lo genera Alegra. */
  governmentTestSetId: string;
}

export type EstadoDocumentoElectronico = 'PENDIENTE' | 'ACEPTADO' | 'ACEPTADO_CON_OBSERVACIONES' | 'RECHAZADO' | 'ERROR';

export interface DocumentoElectronico {
  id: string;
  ventaId: string;
  tipo: 'DEE_POS' | 'FACTURA' | 'NOTA_CREDITO';
  estado: EstadoDocumentoElectronico;
  /** Solo notas crédito: la devolución que las originó. */
  devolucionId?: string | null;
  cufe?: string;
  cude?: string;
  errorMensaje?: string;
  erroresDetalle?: string[] | null;
  trackingReference?: unknown;
  alegraDocumentId?: string;
  intentos: number;
  numero?: number;
  prefijo?: string;
  numeroCompleto?: string;
  fechaEmision?: string;
  qrContenido?: string;
  ambiente?: 'SANDBOX' | 'PRODUCCION';
  nombreCliente?: string;
  /** Fase 6a: período de contingencia en que se expidió como factura de papel; null = factura electrónica normal. */
  periodoContingenciaId?: string | null;
  /** true = factura de talonario escrita a mano y registrada después. */
  transcritaDeTalonario?: boolean;
  /** Fase 7: último envío al correo del cliente. null = nunca se envió. */
  correoEstado?: 'ENVIANDO' | 'ENVIADO' | 'FALLIDO' | null;
  correoDestinatario?: string | null;
  correoEnviadoEn?: string | null;
  correoError?: string | null;
  /** `numeric` de Postgres — llega como string por JSON, pasar siempre por `Number(...)`. */
  total?: number | string;
  createdAt: string;
}

export interface ResumenFacturas {
  aceptados: number;
  pendientes: number;
  rechazados: number;
}

export interface ListadoFacturas {
  items: DocumentoElectronico[];
  total: number;
  pagina: number;
  porPagina: number;
  resumen: ResumenFacturas;
  tieneLogo: boolean;
}

export interface FiltrosFacturas {
  estado?: EstadoDocumentoElectronico;
  desde?: string;
  hasta?: string;
  q?: string;
  pagina?: number;
  porPagina?: number;
}

/** Venta tal como la devuelve `GET /facturas/:id` — los `numeric` llegan como string. */
export interface VentaFactura {
  id: string;
  tipoVenta: 'CONTADO' | 'CREDITO';
  nombreCliente: string;
  subtotal: number | string;
  descuentoTotal: number | string;
  impuestoTotal: number | string;
  total: number | string;
  cliente?: { nombre: string; documentoIdentidad?: string; tipoDocumentoIdentidad?: string; email?: string | null } | null;
  items: {
    id: string;
    nombreProducto: string;
    cantidad: number | string;
    precioUnitario: number | string;
    baseImponible: number | string;
    impuesto: number | string;
  }[];
  pagos: { id: string; metodoPago: string; monto: number | string }[];
}

export interface DetalleFactura {
  documento: DocumentoElectronico;
  venta: VentaFactura | null;
  qrDataUrl: string | null;
}
