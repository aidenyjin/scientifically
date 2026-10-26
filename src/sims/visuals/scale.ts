/** Smallest 1/2/2.5/5 × 10^n that is ≥ v (for scene scales and rulers). */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v - 1e-12) return m * mag;
  return 10 * mag;
}

/** Like niceCeil with finer steps (…40, 50, 60, 80, 100…) so scenes don't waste space. */
export function niceCeilFine(v: number): number {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * mag >= v - 1e-12) return m * mag;
  return 10 * mag;
}

/** A 1/2/5 × 10^n tick step giving about `count` ticks over `span`. */
export function tickStep(span: number, count = 5): number {
  const rough = span / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Short number label for scene text: 19.9, 0.25, 120. */
export function short(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return String(Number(v.toFixed(digits)));
}
