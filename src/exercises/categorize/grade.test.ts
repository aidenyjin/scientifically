import { describe, expect, it } from "vitest";
import { categorize } from "./index";

const ex = categorize.examples[2]; // renewable / non-renewable
const right = ex.items.map((it) => it.categoryId);

describe("categorize", () => {
  it("examples are valid", () => {
    expect(categorize.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of categorize.examples) {
      expect(example.id.startsWith("cat-")).toBe(true);
      expect(categorize.schema.safeParse(example).success).toBe(true);
      expect(categorize.autoCheck?.(example)).toEqual([]);
    }
  });

  it("grades all-correct assignments as correct", () => {
    const result = categorize.grade(ex, { assignments: right });
    expect(result.correct).toBe(true);
    expect(result.feedback).toBeUndefined();
  });

  it("any wrong assignment is incorrect, with a count", () => {
    const flipped = right.map((id, i) => (i < 2 ? (id === "renewable" ? "non-renewable" : "renewable") : id));
    const result = categorize.grade(ex, { assignments: flipped });
    expect(result.correct).toBe(false);
    expect(result.feedback).toBe("2 of 8 items are in the wrong group");
    expect(categorize.grade(ex, { assignments: right.slice(1) }).correct).toBe(false);
  });

  it("lists each category with its items", () => {
    expect(categorize.grade(ex, { assignments: [] }).correctAnswerText).toBe(
      "Renewable: Solar, Wind, Geothermal, Hydroelectric · Non-renewable: Coal, Natural gas, Crude oil, Uranium (nuclear)",
    );
  });

  it("rejects malformed responses, and grading them only for the answer text doesn't throw", () => {
    expect(categorize.responseSchema.safeParse({}).success).toBe(false);
    expect(categorize.responseSchema.safeParse({ assignments: [1, 2] }).success).toBe(false);
    expect(categorize.grade(ex, {} as never).correct).toBe(false);
  });

  it("schema rejects unknown category ids, empty categories and duplicate ids", () => {
    const badItem = { ...ex, items: [...ex.items.slice(1), { text: "Tidal", categoryId: "tidal" }] };
    expect(categorize.schema.safeParse(badItem).success).toBe(false);
    const empty = { ...ex, categories: [...ex.categories, { id: "other", label: "Other" }] };
    expect(categorize.schema.safeParse(empty).success).toBe(false);
    const dupe = { ...ex, categories: [ex.categories[0], { ...ex.categories[1], id: ex.categories[0].id }] };
    expect(categorize.schema.safeParse(dupe).success).toBe(false);
  });

  it("autoCheck flags duplicate item texts", () => {
    const items = [...ex.items.slice(0, 7), { text: "*solar*", categoryId: "renewable" }];
    expect(categorize.autoCheck?.({ ...ex, items })).toContain("items contain duplicate texts");
  });
});
