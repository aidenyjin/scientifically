import { describe, expect, it } from "vitest";
import { exerciseCores, gradeExercise, type Exercise } from "./registry";
import { solve } from "./solve";

describe("solve", () => {
  for (const core of exerciseCores) {
    it(`every ${core.type} example is answerable`, () => {
      for (const ex of core.examples as Exercise[]) {
        const result = gradeExercise(ex, solve(ex));
        expect(result.correct, `${ex.id}: ${JSON.stringify(result)}`).toBe(true);
      }
    });
  }
});
