import { describe, expect, it } from "vitest";
import { numericAnswerText, requiresUnit } from "./grade";
import { numeric } from "./index";
import type { Numeric } from "./schema";
import { normalizeUnit, unitsMatch } from "./units";

const [sunlight, density, pendulum] = numeric.examples;

const base: Numeric = {
  id: "num-test",
  type: "numeric",
  prompt: "What is the acceleration?",
  explanation: "a = F / m",
  skillTags: ["motion.acceleration"],
  difficulty: 2,
  answer: 9.81,
  tolerance: { abs: 0.05 },
  unit: "m/s^{2}",
};

describe("numeric", () => {
  it("examples are valid and pass autoCheck", () => {
    expect(numeric.examples.length).toBeGreaterThanOrEqual(2);
    for (const ex of numeric.examples) {
      expect(numeric.schema.safeParse(ex).success, ex.id).toBe(true);
      expect(numeric.autoCheck?.(ex), ex.id).toEqual([]);
    }
  });

  it("grades within tolerance", () => {
    expect(numeric.grade(sunlight, { value: 500 }).correct).toBe(true);
    expect(numeric.grade(sunlight, { value: 499 }).correct).toBe(true);
    expect(numeric.grade(sunlight, { value: 506 }).correct).toBe(false);
    expect(numeric.grade(base, { value: 9.8 }).correct).toBe(true);
    expect(numeric.grade(base, { value: 9.7 }).correct).toBe(false);
  });

  it("reports the correct answer with its unit", () => {
    expect(numeric.grade(base, { value: 1 }).correctAnswerText).toBe("9.81 m/s^{2}");
    expect(numericAnswerText({ answer: 3e8, unit: "m/s" })).toBe("3×10^{8} m/s");
    expect(numericAnswerText({ answer: 0.1 + 0.2 })).toBe("0.3");
  });

  it("gives a rounding nudge for near misses (within 3× tolerance)", () => {
    expect(numeric.grade(base, { value: 9.7 }).feedback).toBe("Close! Check your rounding.");
    expect(numeric.grade(base, { value: 9.66 }).feedback).toBe("Close! Check your rounding.");
    expect(numeric.grade(base, { value: 9.5 }).feedback).toBeUndefined();
    expect(numeric.grade(sunlight, { value: 510 }).feedback).toBe("Close! Check your rounding.");
  });

  it("spots sign and power-of-ten slips", () => {
    expect(numeric.grade(base, { value: -9.81 }).feedback).toBe("Right size, wrong sign.");
    expect(numeric.grade(sunlight, { value: 0.5 }).feedback).toMatch(/factor of 1000/);
    expect(numeric.grade(sunlight, { value: 5000 }).feedback).toMatch(/factor of 10 /);
    expect(numeric.grade(sunlight, { value: 123 }).feedback).toBeUndefined();
  });

  it("ignores the unit when the learner wasn't asked for it", () => {
    expect(requiresUnit(base)).toBe(false);
    expect(numeric.grade(base, { value: 9.81 }).correct).toBe(true);
    expect(requiresUnit({ unit: "s", unitChoices: [] })).toBe(false);
  });

  it("requires the right unit when there are unitChoices", () => {
    expect(requiresUnit(density)).toBe(true);
    expect(numeric.grade(density, { value: 2.7, unit: "g/cm^{3}" }).correct).toBe(true);
    expect(numeric.grade(density, { value: 2.7 }).correct).toBe(false);
    const wrongUnit = numeric.grade(density, { value: 2.7, unit: "cm^{3}/g" });
    expect(wrongUnit.correct).toBe(false);
    expect(wrongUnit.feedback).toBe("Right number — but check the unit.");
    expect(wrongUnit.correctAnswerText).toBe("2.7 g/cm^{3}");
  });

  it("compares units ignoring spaces, case and superscript style", () => {
    expect(numeric.grade(density, { value: 2.7, unit: "G / CM³" }).correct).toBe(true);
    expect(numeric.grade(density, { value: 2.7, unit: "g/cm^3" }).correct).toBe(true);
    expect(unitsMatch("m/s^{2}", "m/s²")).toBe(true);
    expect(unitsMatch("m/s^2", "M/S^{2}")).toBe(true);
    expect(unitsMatch("m s⁻¹", "ms^{-1}")).toBe(true);
    expect(unitsMatch("kg·m/s", "kg m/s")).toBe(true);
    expect(unitsMatch("m/s", "m/s^{2}")).toBe(false);
    expect(normalizeUnit(" N·m ")).toBe("nm");
  });

  it("never throws on malformed responses (used for skip)", () => {
    const bad = {} as never;
    expect(numeric.grade(density, bad)).toMatchObject({
      correct: false,
      correctAnswerText: "2.7 g/cm^{3}",
    });
    expect(numeric.grade(base, { value: NaN }).correct).toBe(false);
  });

  it("autoCheck verifies the computation", () => {
    expect(numeric.autoCheck?.(pendulum)).toEqual([]);
    expect(numeric.autoCheck?.({ ...pendulum, answer: 2.2 })).toEqual([
      "computation gives 2.00709 but answer is 2.2 (outside tolerance)",
    ]);
    expect(
      numeric.autoCheck?.({ ...base, computation: { expr: "F / m", vars: { F: 10 } } }),
    ).toEqual(['computation.expr can\'t be evaluated: unknown variable "m"']);
    expect(
      numeric.autoCheck?.({ ...base, computation: { expr: "F / m", vars: { F: 98.1, m: 10 } } }),
    ).toEqual([]);
    expect(numeric.autoCheck?.(base)).toEqual([]);
  });

  it("autoCheck flags a tolerance that accepts 0", () => {
    expect(numeric.autoCheck?.({ ...base, answer: 1.6e-19, tolerance: { abs: 0.01 } })).toEqual([
      "tolerance is so wide that 0 would be accepted",
    ]);
    expect(numeric.autoCheck?.({ ...base, answer: 0, tolerance: { abs: 0.01 } })).toEqual([]);
  });

  it("autoCheck flags unit choices that clash after normalising", () => {
    expect(numeric.autoCheck?.({ ...density, unitChoices: ["G/CM³", "kg"] })).toEqual([
      'unitChoices "G/CM³" duplicates another unit (units compare case-insensitively)',
    ]);
    expect(numeric.autoCheck?.({ ...density, unitChoices: ["kg", "kg"] })).toHaveLength(1);
  });

  it("schema requires a tolerance and a unit for unitChoices", () => {
    expect(numeric.schema.safeParse({ ...base, tolerance: {} }).success).toBe(false);
    expect(numeric.schema.safeParse({ ...base, unit: undefined, unitChoices: ["s"] }).success).toBe(
      false,
    );
  });
});
