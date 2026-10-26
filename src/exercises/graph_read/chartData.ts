import type { GraphRead } from "./schema";
import { extent, niceAxis } from "./ticks";

type Chart = GraphRead["chart"];

/** Fixed categorical order — colour follows the series, never its rank. */
export const SERIES_COLORS = ["var(--brand)", "var(--gem)", "var(--streak)", "var(--correct)"] as const;
/** Secondary encoding for scatter markers so identity is never colour-only. */
export const SERIES_SHAPES = ["circle", "diamond", "square", "triangle"] as const;

export const seriesKey = (i: number) => `s${i}`;

export type Row = { x: number; label: string } & Record<string, number | string | null>;

/**
 * Rows for line/bar charts: one row per x value (union over series), with
 * each series' y under `s0`, `s1`… (null where a series has no point).
 */
export function chartRows(chart: Chart): Row[] {
  const xs = [...new Set(chart.series.flatMap((s) => s.points.map(([x]) => x)))].sort((a, b) => a - b);
  return xs.map((x) => {
    const row: Row = { x, label: categoryLabel(chart, x) };
    chart.series.forEach((s, i) => {
      const point = s.points.find(([px]) => px === x);
      row[seriesKey(i)] = point ? point[1] : null;
    });
    return row;
  });
}

export function categoryLabel(chart: Chart, x: number): string {
  if (chart.xCategories && Number.isInteger(x) && chart.xCategories[x] !== undefined) return chart.xCategories[x];
  return String(x);
}

/** Scatter data: per-series point objects. */
export function scatterData(chart: Chart): { x: number; y: number; series: number }[][] {
  return chart.series.map((s, i) => s.points.map(([x, y]) => ({ x, y, series: i })));
}

/** Round-numbered axes covering every plotted point. Bars always start at 0. */
export function chartAxes(chart: Chart) {
  const points = chart.series.flatMap((s) => s.points);
  const [xMin, xMax] = extent(points.map(([x]) => x));
  const [yMin, yMax] = extent(points.map(([, y]) => y));
  return {
    x: niceAxis(xMin, xMax, { maxTicks: 9 }),
    y: niceAxis(yMin, yMax, { maxTicks: 9, zero: chart.kind === "bar" }),
  };
}
