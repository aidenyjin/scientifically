import { describe, expect, it } from "vitest";
import { multiSelect } from "./index";

const ex = multiSelect.examples[1]; // vectors: answers 0, 2, 4

describe("multi_select", () => {
  it("examples are valid", () => {
    expect(multiSelect.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of multiSelect.examples) {
      expect(multiSelect.schema.safeParse(example).success).toBe(true);
      expect(multiSelect.autoCheck?.(example)).toEqual([]);
    }
  });

  it("is correct only for the exact set, in any order", () => {
    expect(multiSelect.grade(ex, { indices: [4, 0, 2] }).correct).toBe(true);
    expect(multiSelect.grade(ex, { indices: [0, 2] }).correct).toBe(false);
    expect(multiSelect.grade(ex, { indices: [0, 1, 2, 4] }).correct).toBe(false);
    expect(multiSelect.grade(ex, { indices: [1, 3] }).correct).toBe(false);
  });

  it("ignores duplicate indices in the response", () => {
    expect(multiSelect.grade(ex, { indices: [0, 0, 2, 4] }).correct).toBe(true);
  });

  it("lists the correct options in authoring order", () => {
    const shuffled = { ...ex, answerIndices: [4, 0, 2] };
    expect(multiSelect.grade(shuffled, { indices: [] }).correctAnswerText).toBe(
      "Velocity, Force, Acceleration",
    );
  });

  it("explains what went wrong", () => {
    expect(multiSelect.grade(ex, { indices: [0, 2] }).feedback).toBe("You missed 1.");
    expect(multiSelect.grade(ex, { indices: [0, 1, 2, 3, 4] }).feedback).toBe("2 of your picks are wrong.");
    expect(multiSelect.grade(ex, { indices: [0, 1] }).feedback).toBe("1 of your picks is wrong and you missed 2.");
    expect(multiSelect.grade(ex, { indices: [0, 2, 4] }).feedback).toBeUndefined();
  });

  it("does not crash on a malformed response", () => {
    const bad = {} as unknown as { indices: number[] };
    expect(multiSelect.grade(ex, bad)).toMatchObject({ correct: false });
  });

  it("schema rejects bad answer indices", () => {
    expect(multiSelect.schema.safeParse({ ...ex, answerIndices: [9] }).success).toBe(false);
    expect(multiSelect.schema.safeParse({ ...ex, answerIndices: [0, 0] }).success).toBe(false);
    expect(multiSelect.schema.safeParse({ ...ex, answerIndices: [0, 1, 2, 3, 4, 5] }).success).toBe(false);
  });

  it("autoCheck flags duplicates and catch-all options", () => {
    expect(multiSelect.autoCheck?.({ ...ex, options: ["A", "a", "B"] })).toContain("options contain duplicates");
    expect(multiSelect.autoCheck?.({ ...ex, options: ["A", "B", "All of the above"] })).toHaveLength(1);
  });
});
