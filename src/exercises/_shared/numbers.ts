/** Tolerance check shared by numeric-style exercises. */
export function withinTolerance(
  value: number,
  answer: number,
  tolerance: { abs?: number; rel?: number },
): boolean {
  if (!Number.isFinite(value)) return false;
  const diff = Math.abs(value - answer);
  if (tolerance.abs !== undefined && diff <= tolerance.abs + 1e-12) return true;
  if (tolerance.rel !== undefined && diff <= Math.abs(answer) * tolerance.rel + 1e-12) return true;
  return false;
}

/**
 * Parse what a learner types into a number field. Accepts "1500", "1,500",
 * "1 500", "-0.5", ".5", "3e8", "3.0E8", "3×10^8", "3x10^8", "3*10^8", "3·10^8".
 * Returns null if it isn't a number.
 */
export function parseLearnerNumber(input: string): number | null {
  let s = input.trim().replace(/[\s,]/g, "").replace(/−/g, "-");
  if (!s) return null;
  const sci = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))[×xX*·]10\^?([+-]?\d+)$/);
  if (sci) s = `${sci[1]}e${sci[2]}`;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Format a number for display: trims float noise, uses ×10^n for very large/small. */
export function formatNumber(n: number, maxSig = 6): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 1e-3) {
    const exp = Math.floor(Math.log10(abs));
    const mant = Number((n / 10 ** exp).toPrecision(Math.min(maxSig, 4)));
    return `${mant}×10^{${exp}}`;
  }
  return String(Number(n.toPrecision(maxSig)));
}
