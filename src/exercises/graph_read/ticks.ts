/** "Nice" step for a span: 1, 2 or 5 × 10^n (no 2.5 — gridlines stay on easy numbers). */
export function niceStep(span: number, maxTicks: number): number {
  const rough = span / Math.max(1, maxTicks - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

const clean = (n: number) => Number(n.toPrecision(12));

/**
 * Axis domain and ticks that cover [min, max] on round numbers, so learners
 * can read values off gridlines. Includes 0 when the data starts near it
 * (or always, with `zero`).
 */
export function niceAxis(
  min: number,
  max: number,
  { maxTicks = 6, zero = false }: { maxTicks?: number; zero?: boolean } = {},
): { domain: [number, number]; ticks: number[] } {
  let lo = min;
  let hi = max;
  if (zero || (lo >= 0 && lo <= hi * 0.5)) lo = Math.min(0, lo);
  if (zero && hi < 0) hi = 0;
  if (hi === lo) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.5;
    lo -= lo === 0 ? 0 : pad;
    hi += pad;
  }
  const step = niceStep(hi - lo, maxTicks);
  const start = clean(Math.floor(lo / step + 1e-9) * step);
  const end = clean(Math.ceil(hi / step - 1e-9) * step);
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 1e-6; v += step) ticks.push(clean(v));
  return { domain: [start, end], ticks };
}

/** Min/max over a list of numbers (assumes non-empty). */
export function extent(values: number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}
