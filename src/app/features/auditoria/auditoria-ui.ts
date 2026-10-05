import { BadgeTone } from '../../shared/ui/atoms/badge/badge';
import { AccionAuditoria, OrigenAuditoria, RegistroAuditoria } from '../../core/models/auditoria.model';

export const ACCIONES_AUDITORIA: { valor: AccionAuditoria; etiqueta: string; tono: BadgeTone }[] = [
  { valor: 'CREAR', etiqueta: 'Creó', tono: 'success' },
  { valor: 'EDITAR', etiqueta: 'Editó', tono: 'info' },
  { valor: 'DESACTIVAR', etiqueta: 'Desactivó', tono: 'warning' },
  { valor: 'REACTIVAR', etiqueta: 'Reactivó', tono: 'success' },
  { valor: 'ELIMINAR', etiqueta: 'Eliminó', tono: 'danger' },
  { valor: 'ANULAR', etiqueta: 'Anuló', tono: 'danger' },
  { valor: 'ABRIR', etiqueta: 'Abrió', tono: 'neutral' },
  { valor: 'CERRAR', etiqueta: 'Cerró', tono: 'neutral' },
  { valor: 'AJUSTAR', etiqueta: 'Ajustó', tono: 'warning' },
  { valor: 'EMITIR', etiqueta: 'Emitió', tono: 'info' },
  { valor: 'CANCELAR', etiqueta: 'Canceló', tono: 'danger' },
  { valor: 'REGISTRAR', etiqueta: 'Registró', tono: 'neutral' },
  { valor: 'CAMBIAR_PERMISOS', etiqueta: 'Permisos', tono: 'warning' },
];

export const accionAuditoria = (a: AccionAuditoria) =>
  ACCIONES_AUDITORIA.find((x) => x.valor === a) ?? { valor: a, etiqueta: a, tono: 'neutral' as BadgeTone };

const ORIGEN: Record<Exclude<OrigenAuditoria, 'USUARIO'>, string> = {
  SISTEMA: 'Sistema',
  WEBHOOK: 'Pago en línea / DIAN',
  TIENDA_ONLINE: 'Tienda online',
};

export function autorAuditoria(r: RegistroAuditoria): string {
  if (r.origen === 'USUARIO') return r.usuarioNombre ?? 'Usuario';
  return ORIGEN[r.origen];
}

/** Pantalla donde vive cada entidad auditada (link "Ver registro"); las que no figuran no llevan link. */
export const RUTA_ENTIDAD: Record<string, string> = {
  Producto: '/productos',
  Categoria: '/categorias',
  Marca: '/marcas',
  Linea: '/marcas',
  Proveedor: '/proveedores',
  ProductoProveedor: '/proveedores',
  Negocio: '/mi-negocio',
  Sucursal: '/sucursales',
  Bodega: '/bodegas',
  TiendaOnline: '/configuracion/tienda-online',
  Usuario: '/usuarios',
  Rol: '/roles',
  Cliente: '/clientes',
  DireccionCliente: '/clientes',
  Promocion: '/configuracion/cupones',
  MetodoPago: '/metodos-pago',
  ReglaAlerta: '/alertas',
  NumeracionComprobante: '/facturacion',
  ConfiguracionPagoWompi: '/configuracion/pagos-wompi',
  HabilitacionFacturacionElectronica: '/facturacion/electronica',
  Venta: '/ventas',
  TurnoCaja: '/caja',
  Domicilio: '/domicilios',
  DocumentoElectronico: '/facturacion/comprobantes',
  PeriodoContingencia: '/facturacion/contingencia',
  Suscripcion: '/configuracion/mi-plan',
};

// Hora de Colombia explícita: el backend agrupa y filtra por día en America/Bogota.
const ZONA = 'America/Bogota';
const FORMATO_DIA_CLAVE = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });
const FORMATO_DIA_TITULO = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const FORMATO_HORA = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit' });

/** 'YYYY-MM-DD' del día en Colombia. */
export const diaAuditoria = (iso: string) => FORMATO_DIA_CLAVE.format(new Date(iso));

export function tituloDiaAuditoria(iso: string): string {
  const texto = FORMATO_DIA_TITULO.format(new Date(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const horaAuditoria = (iso: string) => FORMATO_HORA.format(new Date(iso));
