import type { EChartsOption } from 'echarts';
import { OpcionesGrafico, SerieResultado, TipoGrafico } from '../../../../core/models/grafico.model';

const FORMATO_MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Convierte el resultado crudo del backend (`{etiqueta, datos:{x,y}[]}[]`) en
 * un `EChartsOption` según el tipo de gráfico elegido — un solo lugar que
 * traduce datos a visual, usado tanto por el wizard (vista previa) como por
 * los widgets ya guardados en Dashboard/Reportes.
 */
export function construirOpcionEcharts(
  tipo: TipoGrafico,
  series: SerieResultado[],
  opciones?: OpcionesGrafico,
): EChartsOption {
  if (tipo === 'PASTEL' || tipo === 'DONA') {
    return construirOpcionCircular(tipo, series, opciones);
  }
  return construirOpcionCartesiana(tipo, series, opciones);
}

function construirOpcionCircular(
  tipo: TipoGrafico,
  series: SerieResultado[],
  opciones?: OpcionesGrafico,
): EChartsOption {
  const primera = series[0];
  const datos = (primera?.datos ?? []).map((d) => ({ name: d.x, value: d.y }));

  return {
    tooltip: { trigger: 'item', valueFormatter: (v) => FORMATO_MONEDA.format(Number(v)) },
    legend: opciones?.mostrarLeyenda === false ? undefined : { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: tipo === 'DONA' ? ['45%', '72%'] : '72%',
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}: {d}%' },
        data: datos,
      },
    ],
  };
}

function construirOpcionCartesiana(
  tipo: TipoGrafico,
  series: SerieResultado[],
  opciones?: OpcionesGrafico,
): EChartsOption {
  const categorias = [...new Set(series.flatMap((s) => s.datos.map((d) => d.x)))].sort();
  const apilado = tipo === 'BARRA_APILADA' || opciones?.apilado;
  const esArea = tipo === 'AREA';
  const esBarra = tipo === 'BARRA' || tipo === 'BARRA_APILADA';

  return {
    tooltip: { trigger: 'axis', valueFormatter: (v) => FORMATO_MONEDA.format(Number(v)) },
    legend: opciones?.mostrarLeyenda === false ? undefined : { top: 0 },
    grid: { left: 8, right: 16, top: opciones?.mostrarLeyenda === false ? 24 : 40, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: categorias },
    yAxis: { type: 'value' },
    series: series.map((serie) => {
      const porFecha = new Map(serie.datos.map((d) => [d.x, d.y]));
      return {
        name: serie.etiqueta,
        type: esBarra ? 'bar' : 'line',
        stack: apilado ? 'total' : undefined,
        areaStyle: esArea ? {} : undefined,
        data: categorias.map((c) => porFecha.get(c) ?? 0),
      };
    }),
  };
}
