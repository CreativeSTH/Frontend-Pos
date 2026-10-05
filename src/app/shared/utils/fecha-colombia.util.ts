/** Colombia es UTC−5 fijo, sin horario de verano: las fechas de negocio no dependen del reloj del equipo. */
const OFFSET_MS = 5 * 3600 * 1000;

/** 'YYYY-MM-DD' de hoy (o de `instante`) en Colombia. */
export function hoyColombia(instante: Date = new Date()): string {
  return new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** 'HH:MM' de `instante` en Colombia. */
export function horaColombia(instante: Date | string): string {
  return new Date(new Date(instante).getTime() - OFFSET_MS).toISOString().slice(11, 16);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de `fecha`. */
export function lunesDe(fecha: string): string {
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return sumarDias(fecha, -((dow + 6) % 7));
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

/** Instante ISO de una fecha + hora 'HH:MM' en Colombia. */
export function isoColombia(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00-05:00`).toISOString();
}

/** Minutos de un intervalo de turno; si fin <= inicio, cruza la medianoche. */
export function minutosTurno(horaInicio: string, horaFin: string): number {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const d = min(horaFin) - min(horaInicio);
  return d > 0 ? d : d + 24 * 60;
}

/** '8 h 30 min' */
export function duracionLegible(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Etiqueta en español de una fecha calendario 'YYYY-MM-DD' (la app no registra el locale `es` para
 * `DatePipe`). Ej.: `etiquetaFecha('2026-10-05', { weekday: 'short', day: 'numeric' })` → 'lun 5'.
 */
export function etiquetaFecha(fecha: string, opciones: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-CO', { ...opciones, timeZone: 'UTC' })
    .format(new Date(`${fecha}T12:00:00Z`))
    .replace(/\./g, '');
}
