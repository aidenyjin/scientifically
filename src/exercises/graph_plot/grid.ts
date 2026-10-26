import type { GraphPlot } from "./schema";

type Axes = GraphPlot["axes"];

/** Float-noise cleanup: 0.1 + 0.2 → 0.3. */
export const clean = (n: number) => Number(n.toPrecision(12));

/** Number of grid steps along each axis (intersections are 0..n inclusive). */
export function gridSize(axes: Axes): { nx: number; ny: number } {
  return {
    nx: Math.round((axes.xMax - axes.xMin) / axes.xStep),
    ny: Math.round((axes.yMax - axes.yMin) / axes.yStep),
  };
}

/** True when `v` is min + k·step for a whole k (within float noise). */
export function onGrid(v: number, min: number, step: number): boolean {
  const k = (v - min) / step;
  return Math.abs(k - Math.round(k)) < 1e-6;
}

/** A grid intersection, as whole-number indices from the axis minimums. */
export type Cell = { i: number; j: number };

export function cellValue(axes: Axes, cell: Cell): [number, number] {
  return [clean(axes.xMin + cell.i * axes.xStep), clean(axes.yMin + cell.j * axes.yStep)];
}

/** Nearest intersection to a data-space point, clamped to the grid. */
export function snapToCell(axes: Axes, x: number, y: number): Cell {
  const { nx, ny } = gridSize(axes);
  const clamp = (v: number, n: number) => Math.max(0, Math.min(n, v));
  return {
    i: clamp(Math.round((x - axes.xMin) / axes.xStep), nx),
    j: clamp(Math.round((y - axes.yMin) / axes.yStep), ny),
  };
}

export const sameCell = (a: Cell, b: Cell) => a.i === b.i && a.j === b.j;

/** Label every k-th gridline so labels stay at least `minPx` apart (k ∈ 1, 2, 5, 10…). */
export function labelStride(steps: number, lengthPx: number, minPx: number): number {
  const per = lengthPx / Math.max(1, steps);
  for (const k of [1, 2, 5, 10, 20, 50, 100]) if (per * k >= minPx) return k;
  return steps;
}
