import { ReciboContenido } from '../../../core/models/recibo-contenido.model';
import { AsignacionSinConexion, SnapshotPos } from '../../../core/models/sin-conexion.model';

export interface LineaSinConexion {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeImpuesto: number;
}

export interface ParametrosContenido {
  foto: SnapshotPos;
  asignacion: AsignacionSinConexion;
  creadaEn: Date;
  lineas: LineaSinConexion[];
  pagos: { metodo: string; monto: number }[];
  cliente: { nombre: string; tipoDocumentoIdentidad?: string; documentoIdentidad?: string } | null;
  credito: boolean;
}

/** Mismo mapa que `SIGLA_DOCUMENTO` del backend (factura-pdf.service.ts). */
const SIGLA: Record<string, string> = {
  '11': 'RC', '12': 'TI', '13': 'CC', '21': 'TE', '22': 'CE', '31': 'NIT', '41': 'PA', '42': 'DE', '47': 'PEP', '48': 'PPT', '50': 'NIT ext.', '91': 'NUIP',
};

/** Mismo formato que `textoResolucion` del backend (factura-pdf.service.ts). */
function textoResolucion(r: NonNullable<AsignacionSinConexion['resolucion']>): string {
  return (
    `Numeración autorizada por la DIAN — Resolución No. ${r.numero} del ${r.fechaInicio}, ` +
    `prefijo ${r.prefijo} del ${r.rangoDesde} al ${r.rangoHasta}, vigente hasta ${r.fechaFin}`
  );
}

/** Mismo contenido que `contenidoQrContingencia` del backend (contingencia.util.ts). */
function qrContingencia(numero: string, fecha: Date, nit: string, docAdq: string, base: number, iva: number, total: number): string {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha);
  const hora = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(fecha);
  return [
    `NumFac: ${numero}`, `FecFac: ${dia}`, `HorFac: ${hora}-05:00`, `NitFac: ${nit}`, `DocAdq: ${docAdq}`,
    `ValFac: ${base.toFixed(2)}`, `ValIva: ${iva.toFixed(2)}`, `ValTolFac: ${total.toFixed(2)}`,
  ].join('\n');
}

/**
 * La tirilla de una venta sin conexión, armada en la caja con la foto guardada (fase 6b): factura de
 * papel de contingencia si hay número del bloque; si no, recibo provisional. El emisor es el negocio.
 */
export function construirContenidoSinConexion(p: ParametrosContenido): ReciboContenido {
  const items = p.lineas.map((l) => {
    const baseImponible = l.precioUnitario * l.cantidad;
    const impuesto = baseImponible * (l.porcentajeImpuesto / 100);
    return { nombre: l.nombre, cantidad: l.cantidad, baseImponible, impuesto, subtotal: baseImponible + impuesto };
  });
  const subtotal = items.reduce((a, i) => a + i.baseImponible, 0);
  const impuesto = items.reduce((a, i) => a + i.impuesto, 0);
  const total = subtotal + impuesto;
  const base = {
    negocio: { nombre: p.foto.datos.negocio?.nombre ?? p.foto.datos.emisor?.razonSocial ?? '', nit: p.foto.datos.negocio?.nit },
    emisor: p.foto.emisorSucursal,
    fecha: p.creadaEn.toISOString(),
    cliente: p.cliente?.nombre ?? 'Consumidor final',
    items,
    subtotal,
    descuento: 0,
    impuesto,
    total,
    pagos: p.pagos,
    mensajeCierre: p.foto.mensajeCierre,
    terminos: p.foto.terminos,
  };
  const a = p.asignacion;
  if (!a.numero || !a.resolucion) {
    return { ...base, tipo: 'RECIBO', numero: a.numeroProvisional ?? '', leyenda: 'Recibo provisional (venta sin conexión). Este documento no es una factura de venta.' };
  }
  const numero = `${a.prefijo}${a.numero}`;
  const conDoc = !!(p.cliente?.documentoIdentidad && p.cliente.tipoDocumentoIdentidad);
  // Igual que `mapearCustomerAlegra` del backend: un NIT va sin puntos ni dígito de verificación.
  const docAdq = conDoc
    ? p.cliente!.tipoDocumentoIdentidad === '31'
      ? p.cliente!.documentoIdentidad!.split('-')[0].replace(/\D/g, '')
      : p.cliente!.documentoIdentidad!.trim()
    : '222222222222';
  const nit = (p.foto.datos.emisor?.nitConDv ?? p.foto.datos.negocio?.nit ?? '').split('-')[0];
  return {
    ...base,
    tipo: 'FACTURA_ELECTRONICA',
    numero,
    electronica: {
      estado: 'PENDIENTE',
      // Mismo criterio que `encabezadoTirilla` del backend para una factura de papel.
      encabezado: p.foto.datos.ambiente === 'SANDBOX' ? 'DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL' : null,
      numeroCompleto: numero,
      fechaEmision: p.creadaEn.toISOString(),
      cufe: null,
      qrDataUrl: null,
      qrTexto: qrContingencia(numero, p.creadaEn, nit, docAdq, subtotal, impuesto, total),
      resolucion: textoResolucion(a.resolucion),
      emisor: p.foto.datos.emisor,
      adquirente: conDoc
        ? { nombre: p.cliente!.nombre, identificacion: `${SIGLA[p.cliente!.tipoDocumentoIdentidad!] ?? 'Doc.'} ${p.cliente!.documentoIdentidad}` }
        : { nombre: 'Consumidor final', identificacion: 'CC 222222222222' },
      formaPago: p.credito ? 'Crédito' : 'Contado',
      proveedorTecnologico: p.foto.datos.proveedorTecnologico,
      contingencia: true,
      titulo: 'FACTURA DE VENTA DE TALONARIO O DE PAPEL',
      etiquetaCodigo: 'CUDE',
      fabricanteSoftware: p.foto.datos.fabricanteSoftware,
    },
  };
}
