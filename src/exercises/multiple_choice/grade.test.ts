import { describe, expect, it } from "vitest";
import { multipleChoice } from "./index";

const ex = multipleChoice.examples[0];

describe("multiple_choice", () => {
  it("examples are valid", () => {
    for (const example of multipleChoice.examples) {
      expect(multipleChoice.schema.safeParse(example).success).toBe(true);
      expect(multipleChoice.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades the right index as correct", () => {
    expect(multipleChoice.grade(ex, { index: ex.answerIndex }).correct).toBe(true);
    expect(multipleChoice.grade(ex, { index: (ex.answerIndex + 1) % ex.options.length }).correct).toBe(false);
  });

  it("reports the correct answer text", () => {
    expect(multipleChoice.grade(ex, { index: 3 }).correctAnswerText).toBe("Mitochondrion");
  });

  it("rejects an answerIndex outside the options", () => {
    expect(multipleChoice.schema.safeParse({ ...ex, answerIndex: 9 }).success).toBe(false);
  });

  it("autoCheck flags duplicate options", () => {
    expect(multipleChoice.autoCheck?.({ ...ex, options: ["A", "a", "B"] })).toContain(
      "options contain duplicates",
    );
  });
});
