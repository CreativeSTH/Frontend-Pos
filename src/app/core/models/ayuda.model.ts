/** Shape de /ayuda/articulos.json que publica aura-landing (src/lib/ayuda.ts). */
export interface FuenteAyuda {
  texto: string;
  url?: string;
}

export interface ArticuloAyuda {
  slug: string;
  titulo: string;
  categoria: string;
  resumen: string;
  palabrasClave: string[];
  orden: number;
  /** 'YYYY-MM-DD' */
  revisado: string;
  fuentes: FuenteAyuda[];
  relacionados: string[];
  /** HTML semántico (sin clases) renderizado por la landing. */
  html: string;
}

export interface CategoriaIndice {
  id: string;
  nombre: string;
  articulos: string[];
}

export interface IndiceAyuda {
  generado: string;
  categorias: CategoriaIndice[];
  articulos: ArticuloAyuda[];
}

/** Misma regla que la landing: sin tildes ni mayúsculas, todas las palabras deben aparecer. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function filtrarArticulos(articulos: ArticuloAyuda[], consulta: string): ArticuloAyuda[] {
  const palabras = normalizarBusqueda(consulta).split(' ').filter(Boolean);
  if (palabras.length === 0) return articulos;
  return articulos.filter((a) => {
    const texto = normalizarBusqueda([a.titulo, a.resumen, ...(a.palabrasClave ?? [])].join(' '));
    return palabras.every((p) => texto.includes(p));
  });
}

/** Alertas que tienen un artículo que las explica (lista de alertas y campana). */
export const AYUDA_POR_TIPO_ALERTA: Partial<Record<string, string>> = {
  TOPE_FACTURACION: 'por-que-estoy-obligado-a-facturar-electronicamente',
  // Factura sin respuesta de la DIAN hace más de 48 h (no es un rechazo: los rechazos no generan alerta).
  FACTURACION_DIAN_VENCIDA: 'en-validacion-dian',
  CONTINGENCIA_FACTURACION: 'trabajar-sin-internet',
};
