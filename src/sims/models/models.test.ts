import { describe, expect, it } from "vitest";
import { searchSettings, sliderValues, snapToParam } from "../search";
import { getSimModel, resolveParams, SIM_MODELS } from "./index";

const run = (id: string, params: Record<string, number>) => {
  const model = getSimModel(id)!;
  return model.run(resolveParams(model, params));
};

describe("simulation models", () => {
  it("are registered with unique ids, sensible params and descriptions", () => {
    expect(SIM_MODELS.map((m) => m.id)).toEqual([
      "projectile",
      "ohms_law",
      "ideal_gas",
      "pendulum",
      "hookes_law",
      "wave_speed",
    ]);
    for (const m of SIM_MODELS) {
      expect(m.description.length).toBeGreaterThan(40);
      for (const p of m.params) {
        expect(p.min).toBeLessThan(p.max);
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
        expect(snapToParam(p, p.default)).toBe(p.default);
      }
      const out = m.run(resolveParams(m, {}));
      for (const o of m.outputs) expect(Number.isFinite(out[o.name])).toBe(true);
    }
  });

  it("projectile", () => {
    const out = run("projectile", { v0: 20, angle: 45, g: 10 });
    expect(out.range).toBeCloseTo(40, 6);
    expect(out.maxHeight).toBeCloseTo(10, 6);
    expect(out.flightTime).toBeCloseTo(2 * Math.SQRT2, 6);
    // Complementary angles give the same range.
    expect(run("projectile", { v0: 20, angle: 30 }).range).toBeCloseTo(run("projectile", { v0: 20, angle: 60 }).range, 9);
  });

  it("ohms_law", () => {
    expect(run("ohms_law", { voltage: 12, resistance: 4 })).toEqual({ current: 3, power: 36 });
  });

  it("ideal_gas gives kPa with litres", () => {
    // 1 mol at 273.15 K in 22.4 L ≈ 1 atm.
    const model = getSimModel("ideal_gas")!;
    expect(model.run({ moles: 1, temperature: 273.15, volume: 22.4 }).pressure).toBeCloseTo(101.4, 1);
    expect(run("ideal_gas", { moles: 2, temperature: 300, volume: 10 }).pressure).toBeCloseTo(498.84, 2);
  });

  it("pendulum", () => {
    const out = run("pendulum", { length: 1, g: 9.8 });
    expect(out.period).toBeCloseTo(2.007, 3);
    expect(out.frequency).toBeCloseTo(1 / out.period, 9);
    expect(run("pendulum", { length: 4 }).period).toBeCloseTo(2 * run("pendulum", { length: 1 }).period, 9);
  });

  it("hookes_law", () => {
    const out = run("hookes_law", { springConstant: 50, mass: 2, g: 10 });
    expect(out.force).toBe(20);
    expect(out.extension).toBeCloseTo(0.4, 9);
  });

  it("wave_speed", () => {
    expect(run("wave_speed", { frequency: 4, wavelength: 0.5 }).speed).toBe(2);
  });
});

describe("slider grid search", () => {
  const projectile = getSimModel("projectile")!;
  const v0 = projectile.params[0];

  it("enumerates and snaps slider values without float noise", () => {
    const g = projectile.params[2];
    expect(sliderValues(v0)).toHaveLength(40);
    expect(sliderValues(g)).toContain(9.8);
    expect(sliderValues(g, 5)).toEqual([1, 7, 13, 19, 25]);
    expect(snapToParam(g, 9.83)).toBe(9.8);
    expect(snapToParam(v0, 99)).toBe(40);
  });

  it("finds a working setting nearest the reference", () => {
    const res = searchSettings(projectile, { g: 9.8 }, ["v0", "angle"], { output: "range", target: 50, tolerance: 1 }, {
      reference: { v0: 25, angle: 30 },
    });
    expect(res.solution).not.toBeNull();
    expect(Math.abs(res.solutionValue! - 50)).toBeLessThanOrEqual(1);
    expect(res.solution!.v0).toBeGreaterThanOrEqual(23);
  });

  it("reports unreachable goals", () => {
    const res = searchSettings(projectile, { g: 9.8 }, ["angle"], { output: "range", target: 500, tolerance: 1 });
    expect(res.solution).toBeNull();
    expect(res.closest.angle).toBe(45);
  });
});
