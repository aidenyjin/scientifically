import { describe, expect, it } from "vitest";
import { shuffledOrder } from "@/lib/rng";
import { ordering } from "./index";
import { moveItem } from "./move";

const ex = ordering.examples[0];
const identity = ex.items.map((_, i) => i);

describe("ordering", () => {
  it("examples are valid", () => {
    expect(ordering.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of ordering.examples) {
      expect(example.id.startsWith("ord-")).toBe(true);
      expect(ordering.schema.safeParse(example).success).toBe(true);
      expect(ordering.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades the exact order as correct", () => {
    expect(ordering.grade(ex, { order: identity })).toEqual({
      correct: true,
      correctAnswerText: ex.items.join(" → "),
    });
  });

  it("grades any other order as wrong, with how many are in place", () => {
    const swapped = [1, 0, 2, 3];
    const result = ordering.grade(ex, { order: swapped });
    expect(result.correct).toBe(false);
    expect(result.feedback).toBe("2 of 4 in the right place");
    expect(ordering.grade(ex, { order: [0, 1, 2] }).correct).toBe(false);
    expect(ordering.grade(ex, { order: [0, 1, 2, 3, 4] }).correct).toBe(false);
  });

  it("joins the correct order with arrows", () => {
    const em = ordering.examples[1];
    expect(ordering.grade(em, { order: [] }).correctAnswerText).toBe(
      "Gamma rays → X-rays → Ultraviolet → Visible light → Infrared → Microwaves → Radio waves",
    );
  });

  it("the initial shuffle is never already correct", () => {
    for (let seed = 0; seed < 300; seed++) {
      const order = shuffledOrder(ex.items.length, seed);
      expect(ordering.grade(ex, { order }).correct).toBe(false);
    }
  });

  it("rejects malformed responses, and grading them only for the answer text doesn't throw", () => {
    expect(ordering.responseSchema.safeParse({}).success).toBe(false);
    expect(ordering.responseSchema.safeParse({ order: ["a"] }).success).toBe(false);
    expect(ordering.grade(ex, {} as never).correct).toBe(false);
  });

  it("schema enforces 3–7 items and short end labels", () => {
    expect(ordering.schema.safeParse({ ...ex, items: ["a", "b"] }).success).toBe(false);
    expect(ordering.schema.safeParse({ ...ex, startLabel: "x".repeat(25) }).success).toBe(false);
  });

  it("autoCheck flags duplicate and overlong items", () => {
    const problems = ordering.autoCheck?.({ ...ex, items: ["Crust", "**crust**", "x".repeat(91)] });
    expect(problems).toContain("items contain duplicates");
    expect(problems).toContain("item 3 is 91 characters; keep cards under 90");
  });

  it("moveItem moves one entry and clamps the target", () => {
    expect(moveItem([0, 1, 2, 3], 2, 0)).toEqual([2, 0, 1, 3]);
    expect(moveItem([0, 1, 2, 3], 0, 1)).toEqual([1, 0, 2, 3]);
    expect(moveItem([0, 1, 2, 3], 3, 9)).toEqual([0, 1, 2, 3]);
    expect(moveItem([0, 1, 2, 3], -1, 2)).toEqual([0, 1, 2, 3]);
  });
});
