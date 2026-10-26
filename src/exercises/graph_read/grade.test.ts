import { describe, expect, it } from "vitest";
import { chartAxes, chartRows } from "./chartData";
import { graphRead } from "./index";
import type { GraphRead } from "./schema";
import { niceAxis } from "./ticks";

const [numericEx, scatterEx, barEx] = graphRead.examples;

describe("graph_read", () => {
  it("examples are valid", () => {
    expect(graphRead.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of graphRead.examples) {
      expect(graphRead.schema.safeParse(example).success).toBe(true);
      expect(graphRead.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades choice questions by index", () => {
    expect(graphRead.grade(scatterEx, { mode: "choice", index: 0 }).correct).toBe(true);
    expect(graphRead.grade(scatterEx, { mode: "choice", index: 1 }).correct).toBe(false);
    expect(graphRead.grade(scatterEx, { mode: "numeric", value: 0 }).correct).toBe(false);
    expect(graphRead.grade(barEx, { mode: "choice", index: 2 }).correctAnswerText).toBe("About 2.5 times");
  });

  it("grades numeric questions within tolerance", () => {
    expect(graphRead.grade(numericEx, { mode: "numeric", value: 12 }).correct).toBe(true);
    expect(graphRead.grade(numericEx, { mode: "numeric", value: 12.4 }).correct).toBe(true);
    expect(graphRead.grade(numericEx, { mode: "numeric", value: 13 }).correct).toBe(false);
    expect(graphRead.grade(numericEx, { mode: "choice", index: 0 }).correct).toBe(false);
    expect(graphRead.grade(numericEx, { mode: "numeric", value: 1 }).correctAnswerText).toBe("12 m/s");
  });

  it("survives a malformed response (skip)", () => {
    const res = graphRead.grade(numericEx, {} as never);
    expect(res.correct).toBe(false);
    expect(res.correctAnswerText).toBe("12 m/s");
  });

  it("schema rejects an answerIndex outside the options", () => {
    const bad = { ...barEx, question: { mode: "choice", options: ["a", "b"], answerIndex: 5 } };
    expect(graphRead.schema.safeParse(bad).success).toBe(false);
  });

  it("autoCheck flags numeric answers that are not on the chart", () => {
    const ex: GraphRead = { ...numericEx, question: { mode: "numeric", answer: 40, tolerance: { abs: 1 } } };
    expect(graphRead.autoCheck?.(ex).join(" ")).toMatch(/outside the plotted y range/);
    // An x reading ("when does it reach 9 m/s? → 3 s") is fine.
    const xReading: GraphRead = { ...numericEx, question: { mode: "numeric", answer: 3, tolerance: { abs: 0.2 } } };
    expect(graphRead.autoCheck?.(xReading)).toEqual([]);
  });

  it("autoCheck flags bar categories that don't match the points", () => {
    const ex: GraphRead = { ...barEx, chart: { ...barEx.chart, xCategories: ["A", "B"] } };
    expect(graphRead.autoCheck?.(ex).join(" ")).toMatch(/xCategories has 2 labels/);
    const lineWithCats: GraphRead = { ...numericEx, chart: { ...numericEx.chart, xCategories: ["a"] } };
    expect(graphRead.autoCheck?.(lineWithCats)).toContain("xCategories is only for bar charts");
  });

  it("autoCheck flags duplicate options and series names", () => {
    const ex: GraphRead = {
      ...scatterEx,
      question: { mode: "choice", options: ["Iron", "iron ", "Neither"], answerIndex: 0 },
      chart: { ...scatterEx.chart, series: [scatterEx.chart.series[0], scatterEx.chart.series[0]] },
    };
    const problems = graphRead.autoCheck?.(ex) ?? [];
    expect(problems).toContain("options contain duplicates");
    expect(problems).toContain("series names must be unique");
  });
});

describe("chart helpers", () => {
  it("builds nice axes on round numbers", () => {
    expect(niceAxis(0, 15)).toEqual({ domain: [0, 15], ticks: [0, 5, 10, 15] });
    expect(niceAxis(0, 15, { maxTicks: 9 }).ticks).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16]);
    expect(niceAxis(3.7, 24.8, { zero: true }).ticks).toEqual([0, 5, 10, 15, 20, 25]);
    expect(niceAxis(-3, 7).domain[0]).toBeLessThanOrEqual(-3);
    expect(niceAxis(0.1, 0.7).ticks.every((t) => Number.isFinite(t) && String(t).length < 6)).toBe(true);
  });

  it("covers every point", () => {
    const axes = chartAxes(scatterEx.chart);
    expect(axes.y.domain[1]).toBeGreaterThanOrEqual(39.4);
    expect(axes.x.domain[0]).toBe(0);
  });

  it("merges series into rows by x and labels categories", () => {
    const rows = chartRows(barEx.chart);
    expect(rows.map((r) => r.label)).toEqual(["Mercury", "Venus", "Earth", "Mars", "Jupiter"]);
    expect(rows[4].s0).toBe(24.8);
    const scatterRows = chartRows(scatterEx.chart);
    expect(scatterRows.find((r) => r.x === 1)?.s0).toBeNull();
  });
});
