import { describe, expect, it } from "vitest";
import { trueFalse } from "./index";

describe("true_false", () => {
  it("examples are valid", () => {
    for (const ex of trueFalse.examples) expect(trueFalse.schema.safeParse(ex).success).toBe(true);
  });

  it("grades by matching the boolean", () => {
    const ex = trueFalse.examples[0];
    expect(trueFalse.grade(ex, { value: ex.answer }).correct).toBe(true);
    expect(trueFalse.grade(ex, { value: !ex.answer })).toEqual({
      correct: false,
      correctAnswerText: ex.answer ? "True" : "False",
    });
  });
});
