import { describe, expect, it } from "vitest";
import { formatNumber, parseLearnerNumber, withinTolerance } from "./numbers";

describe("numbers", () => {
  it("parses learner input", () => {
    expect(parseLearnerNumber("1,500")).toBe(1500);
    expect(parseLearnerNumber(" -0.5 ")).toBe(-0.5);
    expect(parseLearnerNumber(".5")).toBe(0.5);
    expect(parseLearnerNumber("3e8")).toBe(3e8);
    expect(parseLearnerNumber("3×10^8")).toBe(3e8);
    expect(parseLearnerNumber("6.02x10^23")).toBeCloseTo(6.02e23);
    expect(parseLearnerNumber("1.6×10^-19")).toBeCloseTo(1.6e-19);
    expect(parseLearnerNumber("abc")).toBeNull();
    expect(parseLearnerNumber("")).toBeNull();
    expect(parseLearnerNumber("1.2.3")).toBeNull();
  });

  it("checks tolerance", () => {
    expect(withinTolerance(9.8, 9.81, { abs: 0.05 })).toBe(true);
    expect(withinTolerance(9.7, 9.81, { abs: 0.05 })).toBe(false);
    expect(withinTolerance(102, 100, { rel: 0.02 })).toBe(true);
    expect(withinTolerance(103, 100, { rel: 0.02 })).toBe(false);
    expect(withinTolerance(NaN, 1, { abs: 1 })).toBe(false);
  });

  it("formats numbers", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(3e8)).toBe("3×10^{8}");
    expect(formatNumber(1.6e-19)).toBe("1.6×10^{-19}");
  });
});
