import { describe, expect, it } from "vitest";
import { describeSetting, formatOutputValue } from "./format";
import { simulation } from "./index";
import { getSimModel } from "@/sims/models";
import type { Simulation } from "./schema";

const [projectile, ohms, gas] = simulation.examples;

describe("simulation", () => {
  it("examples are valid", () => {
    expect(simulation.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of simulation.examples) {
      expect(simulation.schema.safeParse(example).success).toBe(true);
      expect(simulation.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades by running the model", () => {
    expect(simulation.grade(projectile, { params: { angle: 45, v0: 22 } }).correct).toBe(true); // 49.4 m
    expect(simulation.grade(projectile, { params: { angle: 45, v0: 20 } }).correct).toBe(false); // 40.8 m
    expect(simulation.grade(ohms, { params: { voltage: 9 } }).correct).toBe(true);
    expect(simulation.grade(ohms, { params: { voltage: 8.5 } }).correct).toBe(false);
    expect(simulation.grade(gas, { params: { volume: 10 } }).correct).toBe(true);
  });

  it("ignores params the learner can't adjust and snaps to the slider", () => {
    // g is fixed at 9.8: a response can't sneak in a lower gravity.
    expect(simulation.grade(projectile, { params: { angle: 45, v0: 20, g: 8 } }).correct).toBe(false);
    expect(simulation.grade(ohms, { params: { voltage: 9.1 } }).correct).toBe(true); // snaps to 9 V
  });

  it("explains a working setting near the learner's attempt", () => {
    const res = simulation.grade(ohms, { params: { voltage: 6 } });
    expect(res.correctAnswerText).toBe("Voltage 9 V gives a current of 0.45 A");
    expect(res.feedback).toBe("Your setting gives 0.3 A, 0.15 A too low.");
    const proj = simulation.grade(projectile, { params: { angle: 45, v0: 20 } });
    expect(proj.correctAnswerText).toMatch(/^Launch speed \d+ m\/s and launch angle \d+° give a range of [\d.]+ m$/);
  });

  it("survives a malformed response (skip)", () => {
    const res = simulation.grade(gas, {} as never);
    expect(res.correct).toBe(false);
    expect(res.correctAnswerText).toBe("Volume 10 L gives a pressure of 249.4 kPa");
  });

  it("autoCheck flags unknown models, params and outputs", () => {
    expect(simulation.autoCheck?.({ ...ohms, modelId: "warp_drive" })[0]).toMatch(/unknown modelId/);
    const bad: Simulation = { ...ohms, adjustable: ["volts"], fixed: { ohms: 3 }, goal: { ...ohms.goal, output: "amps" } };
    const problems = (simulation.autoCheck?.(bad) ?? []).join("\n");
    expect(problems).toMatch(/adjustable "volts"/);
    expect(problems).toMatch(/fixed "ohms"/);
    expect(problems).toMatch(/goal.output "amps"/);
  });

  it("autoCheck flags unreachable targets and goals already met at the start", () => {
    const unreachable: Simulation = { ...ohms, goal: { output: "current", target: 5, tolerance: 0.1 } };
    expect((simulation.autoCheck?.(unreachable) ?? []).join("\n")).toMatch(/can't be reached/);
    const alreadyMet: Simulation = { ...ohms, goal: { output: "current", target: 0.3, tolerance: 0.01 } };
    expect((simulation.autoCheck?.(alreadyMet) ?? []).join("\n")).toMatch(/already give/);
    // A fixed value for an adjustable param sets the starting slider instead.
    expect(simulation.autoCheck?.({ ...alreadyMet, fixed: { resistance: 20, voltage: 12 } })).toEqual([]);
  });

  it("formats values to the goal's precision", () => {
    expect(formatOutputValue(49.3877, 2)).toBe("49.4");
    expect(formatOutputValue(0.4499, 0.015)).toBe("0.45");
    expect(describeSetting(getSimModel("pendulum")!, { length: 1 }, "period", 2.007, 0.05)).toBe(
      "Length 1 m gives a period of 2.007 s",
    );
  });
});
