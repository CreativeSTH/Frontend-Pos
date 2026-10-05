/** CSV para Excel en español: BOM UTF-8, separador ';', decimales con coma y comillas dobles escapadas. */
export function descargarCsv(nombre: string, filas: (string | number)[][]): void {
  const texto = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const s = typeof celda === 'number' ? String(celda).replace('.', ',') : celda;
          return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}
