import { resolveParams } from "./models";
import type { SimModel, SimParam } from "./types";

const clean = (n: number) => Number(n.toPrecision(12));

/** Clamp to the slider range and snap to its step. */
export function snapToParam(p: SimParam, value: number): number {
  if (!Number.isFinite(value)) return p.default;
  const clamped = Math.min(p.max, Math.max(p.min, value));
  return clean(Math.min(p.max, p.min + Math.round((clamped - p.min) / p.step) * p.step));
}

/** Every value a slider can take (min, min+step, … ≤ max), thinned to at most `limit` values. */
export function sliderValues(p: SimParam, limit = Infinity): number[] {
  const count = Math.floor((p.max - p.min) / p.step + 1e-9) + 1;
  const all = Array.from({ length: count }, (_, k) => clean(p.min + k * p.step));
  if (all.length <= limit) return all;
  const n = Math.max(2, Math.floor(limit));
  return Array.from({ length: n }, (_, k) => all[Math.round((k * (all.length - 1)) / (n - 1))]);
}

export interface Goal {
  output: string;
  target: number;
  tolerance: number;
}

export interface SearchResult {
  /** A setting within tolerance (the one nearest `reference`), or null if none was found. */
  solution: Record<string, number> | null;
  solutionValue: number | null;
  /** The setting whose output came closest to the target, reachable or not. */
  closest: Record<string, number>;
  closestValue: number;
}

/**
 * Grid search over the adjustable sliders (other params fixed or default).
 * Exhaustive when the grid has ≤ `budget` points, otherwise evenly thinned.
 */
export function searchSettings(
  model: SimModel,
  fixed: Record<string, number>,
  adjustable: string[],
  goal: Goal,
  { reference = {}, budget = 200_000 }: { reference?: Record<string, number>; budget?: number } = {},
): SearchResult {
  const params = adjustable
    .map((name) => model.params.find((p) => p.name === name))
    .filter((p): p is SimParam => p !== undefined);
  const full = params.map((p) => sliderValues(p));
  const total = full.reduce((n, v) => n * v.length, 1);
  const perDim = total <= budget ? Infinity : Math.floor(budget ** (1 / Math.max(1, params.length)));
  const grids = params.map((p) => sliderValues(p, perDim));

  const start = resolveParams(model, fixed, reference);
  let solution: Record<string, number> | null = null;
  let solutionValue: number | null = null;
  let solutionDistance = Infinity;
  let closest: Record<string, number> = {};
  let closestValue = NaN;
  let closestError = Infinity;

  const index = params.map(() => 0);
  const combos = grids.reduce((n, g) => n * g.length, 1);
  for (let c = 0; c < combos; c++) {
    const chosen: Record<string, number> = {};
    params.forEach((p, d) => (chosen[p.name] = grids[d][index[d]]));
    const value = model.run(resolveParams(model, fixed, chosen))[goal.output];
    const error = Math.abs(value - goal.target);
    if (error < closestError) {
      closestError = error;
      closest = chosen;
      closestValue = value;
    }
    if (error <= goal.tolerance + 1e-9) {
      // Prefer the working setting nearest the reference (fewest slider moves).
      const distance = params.reduce((sum, p) => sum + Math.abs(chosen[p.name] - start[p.name]) / (p.max - p.min), 0);
      if (distance < solutionDistance - 1e-12) {
        solutionDistance = distance;
        solution = chosen;
        solutionValue = value;
      }
    }
    for (let d = params.length - 1; d >= 0; d--) {
      if (++index[d] < grids[d].length) break;
      index[d] = 0;
    }
  }

  return { solution, solutionValue, closest, closestValue };
}
