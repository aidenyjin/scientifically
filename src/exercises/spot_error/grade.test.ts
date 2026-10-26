import { describe, expect, it } from "vitest";
import { spotError } from "./index";

const ex = spotError.examples[1]; // voltmeter: error at index 3

describe("spot_error", () => {
  it("examples are valid", () => {
    expect(spotError.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of spotError.examples) {
      expect(spotError.schema.safeParse(example).success).toBe(true);
      expect(spotError.autoCheck?.(example)).toEqual([]);
    }
  });

  it("is correct only for the error segment", () => {
    expect(spotError.grade(ex, { index: 3 }).correct).toBe(true);
    expect(spotError.grade(ex, { index: 1 }).correct).toBe(false);
  });

  it("shows the correction as the answer (the passage shows the fix inline)", () => {
    expect(spotError.grade(ex, { index: 0 })).toEqual({
      correct: false,
      correctAnswerText: "using a voltmeter connected in parallel",
    });
  });

  it("does not crash on a malformed response", () => {
    const bad = {} as unknown as { index: number };
    expect(spotError.grade(ex, bad).correct).toBe(false);
  });

  it("schema rejects an errorIndex outside the segments", () => {
    expect(spotError.schema.safeParse({ ...ex, errorIndex: 5 }).success).toBe(false);
  });

  it("autoCheck flags a correction that changes nothing", () => {
    expect(spotError.autoCheck?.({ ...ex, correction: " Using a voltmeter connected in series " })).toEqual([
      "correction is the same as the error segment",
    ]);
    expect(spotError.autoCheck?.({ ...ex, segments: ["a", "b", "a", "c", "d"] })).toContain(
      "segments contain duplicates",
    );
  });
});
