import * as echarts from 'echarts';

/**
 * Tema ECharts construido en runtime desde los tokens de `_tokens.scss` (no
 * duplica valores a mano) — así si el tema visual de la app cambia, los
 * gráficos lo siguen automáticamente sin tocar este archivo.
 */
const NOMBRE_TEMA = 'pos-dark';
let registrado = false;

function tokenCss(variable: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return valor || fallback;
}

export function registrarTemaPos(): string {
  if (registrado) return NOMBRE_TEMA;
  registrado = true;

  const colorSerie = [
    tokenCss('--accent-primary', '#5b8cff'),
    tokenCss('--accent-secondary', '#a78bfa'),
    tokenCss('--accent-cyan', '#22d3ee'),
    tokenCss('--accent-success', '#34d399'),
    tokenCss('--accent-warning', '#fbbf24'),
    tokenCss('--accent-danger', '#fb7185'),
  ];
  const textoPrimario = tokenCss('--text-primary', 'rgba(255, 255, 255, 0.94)');
  const textoSecundario = tokenCss('--text-secondary', 'rgba(255, 255, 255, 0.64)');
  const textoTerciario = tokenCss('--text-tertiary', 'rgba(255, 255, 255, 0.4)');
  const bordeGlass = tokenCss('--glass-border', 'rgba(255, 255, 255, 0.09)');
  const bgElevado = tokenCss('--bg-elevated', '#0f111a');
  const fuenteBody = tokenCss('--font-body', "'Inter', system-ui, sans-serif");

  echarts.registerTheme(NOMBRE_TEMA, {
    color: colorSerie,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: fuenteBody, color: textoSecundario },
    title: { textStyle: { color: textoPrimario } },
    legend: { textStyle: { color: textoSecundario }, inactiveColor: textoTerciario },
    tooltip: {
      backgroundColor: bgElevado,
      borderColor: bordeGlass,
      textStyle: { color: textoPrimario },
      extraCssText: 'backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35); border-radius: 8px;',
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: bordeGlass } },
      axisTick: { lineStyle: { color: bordeGlass } },
      axisLabel: { color: textoTerciario },
      splitLine: { lineStyle: { color: bordeGlass } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: bordeGlass } },
      axisTick: { lineStyle: { color: bordeGlass } },
      axisLabel: { color: textoTerciario },
      splitLine: { lineStyle: { color: bordeGlass, type: 'dashed' } },
    },
    line: { smooth: true, lineStyle: { width: 2.5 }, symbol: 'circle', symbolSize: 6 },
    bar: { itemStyle: { borderRadius: [6, 6, 0, 0] } },
    pie: { itemStyle: { borderColor: bgElevado, borderWidth: 2 } },
  });

  return NOMBRE_TEMA;
}
