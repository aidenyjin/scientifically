import { describe, expect, it } from "vitest";
import { matchPoints } from "./grade";
import { cellValue, labelStride, onGrid, snapToCell } from "./grid";
import { graphPlot } from "./index";
import type { GraphPlot } from "./schema";

const ex = graphPlot.examples[0]; // Ohm's law: (2,0.4) … (10,2)

describe("graph_plot", () => {
  it("examples are valid", () => {
    expect(graphPlot.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of graphPlot.examples) {
      expect(graphPlot.schema.safeParse(example).success).toBe(true);
      expect(graphPlot.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades the exact points as correct, in any order", () => {
    const shuffled: [number, number][] = [ex.points[3], ex.points[0], ex.points[4], ex.points[2], ex.points[1]];
    expect(graphPlot.grade(ex, { points: shuffled }).correct).toBe(true);
  });

  it("is wrong when a point is off or the count differs", () => {
    const off: [number, number][] = [...ex.points.slice(0, 4), [10, 1.8]];
    const res = graphPlot.grade(ex, { points: off });
    expect(res.correct).toBe(false);
    expect(res.feedback).toBe("4 of 5 points are in the right place.");
    expect(graphPlot.grade(ex, { points: ex.points.slice(0, 4) }).correct).toBe(false);
    expect(graphPlot.grade(ex, { points: [...ex.points, [1, 0.2]] }).correct).toBe(false);
  });

  it("needs a distinct placed point per target", () => {
    const target: GraphPlot = { ...ex, points: [[2, 0.4], [3, 0.6]], tolerance: 1 };
    // Both targets are within 1 of (2,0.4), but one placed point can't count twice.
    expect(graphPlot.grade(target, { points: [[2, 0.4], [9, 2]] }).correct).toBe(false);
    expect(graphPlot.grade(target, { points: [[3, 0.6], [2, 0.4]] }).correct).toBe(true);
  });

  it("honours tolerance on both axes", () => {
    const loose: GraphPlot = { ...ex, points: [[4, 0.8]], tolerance: 0.5 };
    expect(graphPlot.grade(loose, { points: [[4.5, 1]] }).correct).toBe(true);
    expect(graphPlot.grade(loose, { points: [[5, 0.8]] }).correct).toBe(false);
  });

  it("reports the answer sorted by x and survives malformed responses", () => {
    const res = graphPlot.grade(ex, {} as never);
    expect(res.correct).toBe(false);
    expect(res.correctAnswerText).toBe("(2, 0.4), (4, 0.8), (6, 1.2), (8, 1.6), (10, 2)");
  });

  it("autoCheck flags off-grid points, loose tolerance and duplicates", () => {
    const bad: GraphPlot = { ...ex, points: [[2, 0.5], [4, 0.8], [4, 0.8]], tolerance: 0.2 };
    const problems = graphPlot.autoCheck?.(bad) ?? [];
    expect(problems.join("\n")).toMatch(/\(2, 0.5\) is not on a grid intersection/);
    expect(problems.join("\n")).toMatch(/tolerance must be smaller/);
    expect(problems).toContain("points contain duplicates");
  });

  it("autoCheck flags grids that are too dense or uneven", () => {
    const dense: GraphPlot = { ...ex, axes: { ...ex.axes, xStep: 0.1 }, tolerance: 0 };
    expect((graphPlot.autoCheck?.(dense) ?? []).join("\n")).toMatch(/x axis has 100 grid steps/);
    const uneven: GraphPlot = { ...ex, axes: { ...ex.axes, xMax: 10.5 }, tolerance: 0 };
    expect(graphPlot.autoCheck?.(uneven)).toContain("xMax - xMin must be a whole number of xSteps");
  });

  it("schema rejects points outside the axes", () => {
    expect(graphPlot.schema.safeParse({ ...ex, points: [[12, 1]] }).success).toBe(false);
  });
});

describe("grid helpers", () => {
  const axes = graphPlot.examples[2].axes; // x 0–5 step 0.5, y 0–20 step 2

  it("snaps to the nearest intersection and clamps to the grid", () => {
    expect(snapToCell(axes, 1.2, 4.9)).toEqual({ i: 2, j: 2 });
    expect(snapToCell(axes, -3, 99)).toEqual({ i: 0, j: 10 });
    expect(cellValue(axes, { i: 3, j: 7 })).toEqual([1.5, 14]);
  });

  it("checks grid membership without float noise", () => {
    expect(onGrid(0.3, 0, 0.1)).toBe(true);
    expect(onGrid(0.35, 0, 0.1)).toBe(false);
    expect(cellValue(ex.axes, { i: 0, j: 3 })[1]).toBe(0.6);
  });

  it("thins labels on dense axes", () => {
    expect(labelStride(10, 476, 34)).toBe(1);
    expect(labelStride(20, 476, 34)).toBe(2);
    expect(labelStride(16, 290, 24)).toBe(2);
  });

  it("matching is maximal, not greedy", () => {
    // Greedy would give target 0 the placed point both targets can use.
    const { targetMatch } = matchPoints(
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0.5, 0],
        [-0.5, 0],
      ],
      0.5,
    );
    expect(targetMatch).toEqual([1, 0]);
  });
});
