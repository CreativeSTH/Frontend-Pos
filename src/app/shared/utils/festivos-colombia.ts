/**
 * Copia del algoritmo del backend (`pos-backend/src/empleados/calculo/festivos-colombia.ts`, con tests):
 * festivos de Colombia según la Ley 51 de 1983 (Emiliani). Aquí solo se usa para resaltar días en el horario.
 */
const cache = new Map<number, Set<string>>();

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const masDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const alLunes = (d: Date) => {
  const dow = d.getUTCDay();
  return dow === 1 ? d : masDias(d, (8 - dow) % 7);
};

function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return utc(anio, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}

export function festivosDelAnio(anio: number): Set<string> {
  const enCache = cache.get(anio);
  if (enCache) return enCache;
  const pascua = domingoDePascua(anio);
  const fijos = [utc(anio, 1, 1), utc(anio, 5, 1), utc(anio, 7, 20), utc(anio, 8, 7), utc(anio, 12, 8), utc(anio, 12, 25)];
  const trasladables = [
    utc(anio, 1, 6),
    utc(anio, 3, 19),
    utc(anio, 6, 29),
    utc(anio, 8, 15),
    utc(anio, 10, 12),
    utc(anio, 11, 1),
    utc(anio, 11, 11),
  ].map(alLunes);
  const pascuales = [masDias(pascua, -3), masDias(pascua, -2), masDias(pascua, 43), masDias(pascua, 64), masDias(pascua, 71)];
  const festivos = new Set([...fijos, ...trasladables, ...pascuales].map(iso));
  cache.set(anio, festivos);
  return festivos;
}

export function esFestivo(fecha: string): boolean {
  return festivosDelAnio(Number(fecha.slice(0, 4))).has(fecha);
}

/** Jornada máxima semanal en horas vigente en `fecha` (Ley 2101 de 2021; mismos valores que el backend). */
export function jornadaMaximaSemanal(fecha: string): number {
  if (fecha >= '2026-07-15') return 42;
  if (fecha >= '2025-07-15') return 44;
  if (fecha >= '2024-07-15') return 46;
  if (fecha >= '2023-07-15') return 47;
  return 48;
}
