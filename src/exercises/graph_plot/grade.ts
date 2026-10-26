import type { GradeResult } from "@/content/types";
import { formatNumber } from "../_shared/numbers";
import { gridSize, onGrid } from "./grid";
import type { GraphPlot, GraphPlotResponse } from "./schema";

type Point = [number, number];

const close = (a: Point, b: Point, tolerance: number) =>
  Math.abs(a[0] - b[0]) <= tolerance + 1e-9 && Math.abs(a[1] - b[1]) <= tolerance + 1e-9;

/**
 * Pair each target with a distinct placed point within `tolerance` on both
 * axes (maximum bipartite matching, so the pairing is never order-dependent).
 * Returns, for each target, the index of its placed point or null; and for
 * each placed point, whether it is matched.
 */
export function matchPoints(
  targets: Point[],
  placed: Point[],
  tolerance: number,
): { targetMatch: (number | null)[]; placedMatched: boolean[] } {
  const owner: (number | null)[] = placed.map(() => null); // placed index → target index
  const tryAssign = (t: number, seen: boolean[]): boolean => {
    for (let p = 0; p < placed.length; p++) {
      if (seen[p] || !close(targets[t], placed[p], tolerance)) continue;
      seen[p] = true;
      const current = owner[p];
      if (current === null || tryAssign(current, seen)) {
        owner[p] = t;
        return true;
      }
    }
    return false;
  };
  targets.forEach((_, t) => tryAssign(t, placed.map(() => false)));

  const targetMatch: (number | null)[] = targets.map(() => null);
  owner.forEach((t, p) => {
    if (t !== null) targetMatch[t] = p;
  });
  return { targetMatch, placedMatched: owner.map((t) => t !== null) };
}

const byX = (a: Point, b: Point) => a[0] - b[0] || a[1] - b[1];

export function formatPoints(points: Point[]): string {
  return [...points]
    .sort(byX)
    .map(([x, y]) => `(${formatNumber(x)}, ${formatNumber(y)})`)
    .join(", ");
}

export function gradeGraphPlot(ex: GraphPlot, res: GraphPlotResponse): GradeResult {
  const correctAnswerText = formatPoints(ex.points);
  // Defensive: the player may pass an unparsed response when the learner skips.
  const placed: Point[] = Array.isArray(res?.points) ? res.points : [];
  const { targetMatch } = matchPoints(ex.points, placed, ex.tolerance);
  const matched = targetMatch.filter((m) => m !== null).length;
  const correct = placed.length === ex.points.length && matched === ex.points.length;
  if (correct || placed.length === 0) return { correct, correctAnswerText };
  const n = ex.points.length;
  return {
    correct,
    correctAnswerText,
    feedback:
      placed.length === n
        ? `${matched} of ${n} points ${matched === 1 ? "is" : "are"} in the right place.`
        : `You placed ${placed.length} points; the graph needs ${n}.`,
  };
}

export function autoCheckGraphPlot(ex: GraphPlot): string[] {
  const problems: string[] = [];
  const { axes, points, tolerance } = ex;
  const { nx, ny } = gridSize(axes);

  if (!onGrid(axes.xMax, axes.xMin, axes.xStep)) problems.push("xMax - xMin must be a whole number of xSteps");
  if (!onGrid(axes.yMax, axes.yMin, axes.yStep)) problems.push("yMax - yMin must be a whole number of ySteps");
  if (nx < 2 || nx > 24) problems.push(`x axis has ${nx} grid steps; use 2–24 so points are easy to click`);
  if (ny < 2 || ny > 20) problems.push(`y axis has ${ny} grid steps; use 2–20 so points are easy to click`);

  points.forEach(([x, y]) => {
    if (x < axes.xMin || x > axes.xMax || y < axes.yMin || y > axes.yMax) {
      problems.push(`point (${x}, ${y}) is outside the axes`);
    } else if (!onGrid(x, axes.xMin, axes.xStep) || !onGrid(y, axes.yMin, axes.yStep)) {
      problems.push(`point (${x}, ${y}) is not on a grid intersection (xStep ${axes.xStep}, yStep ${axes.yStep})`);
    }
  });

  if (tolerance >= axes.xStep || tolerance >= axes.yStep) {
    problems.push("tolerance must be smaller than both xStep and yStep, or neighbouring gridpoints would count");
  }

  const keys = points.map(([x, y]) => `${x},${y}`);
  if (new Set(keys).size !== keys.length) problems.push("points contain duplicates");

  return problems;
}
