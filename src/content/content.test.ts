import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildDemoPack } from "./demo-pack";
import { exerciseCores, gradeExercise } from "./registry";
import { contentPackSchema, validatePack } from "./schema/course";

describe("content contract", () => {
  it("every registered example validates against the full exercise union", () => {
    for (const core of exerciseCores) {
      for (const ex of core.examples) {
        const result = core.schema.safeParse(ex);
        expect(result.success, `${core.type}/${ex.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
        expect(core.autoCheck?.(ex as never) ?? [], `${core.type}/${ex.id} autoCheck`).toEqual([]);
      }
    }
  });

  it("demo pack validates", () => {
    const result = validatePack(buildDemoPack());
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("reports duplicate ids with readable paths", () => {
    const pack = buildDemoPack();
    const first = pack.units[0].lessons[0];
    first.exercises.push({ ...first.exercises[0] });
    const result = validatePack(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/duplicate id/);
  });

  it("reports schema errors with JSON paths", () => {
    const pack = buildDemoPack();
    (pack.units[0].lessons[0].exercises[1] as { difficulty: number }).difficulty = 9;
    const result = validatePack(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^units\.0\.lessons\.0\.exercises\.1\.difficulty/);
  });

  it("malformed responses grade as wrong instead of throwing", () => {
    const ex = buildDemoPack().units[0].lessons[0].exercises.find((e) => e.type === "multiple_choice")!;
    expect(gradeExercise(ex, { nope: true }).correct).toBe(false);
  });

  it("produces a JSON Schema for the AI", () => {
    const schema = z.toJSONSchema(contentPackSchema, { unrepresentable: "any" });
    const text = JSON.stringify(schema);
    for (const core of exerciseCores) expect(text).toContain(`"${core.type}"`);
  });
});
