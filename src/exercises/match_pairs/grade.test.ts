import { describe, expect, it } from "vitest";
import { matchPairs } from "./index";
import { columnOrders } from "./layout";

const ex = matchPairs.examples[0];

describe("match_pairs", () => {
  it("examples are valid", () => {
    expect(matchPairs.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of matchPairs.examples) {
      expect(example.id.startsWith("mp-")).toBe(true);
      expect(matchPairs.schema.safeParse(example).success).toBe(true);
      expect(matchPairs.autoCheck?.(example)).toEqual([]);
    }
  });

  it("finishing is always correct; a clean run has no feedback", () => {
    expect(matchPairs.grade(ex, { mistakes: 0 })).toEqual({
      correct: true,
      correctAnswerText: ex.pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
    });
  });

  it("reports slips as feedback", () => {
    expect(matchPairs.grade(ex, { mistakes: 1 }).feedback).toBe("Matched with 1 slip");
    const result = matchPairs.grade(ex, { mistakes: 2 });
    expect(result.correct).toBe(true);
    expect(result.feedback).toBe("Matched with 2 slips");
  });

  it("lists pairs as 'left → right' joined by '; '", () => {
    expect(matchPairs.grade(ex, { mistakes: 0 }).correctAnswerText).toMatch(/^Nucleus → Holds the cell's DNA; /);
  });

  it("rejects malformed responses, and grading them only for the answer text doesn't throw", () => {
    expect(matchPairs.responseSchema.safeParse({}).success).toBe(false);
    expect(matchPairs.responseSchema.safeParse({ mistakes: -1 }).success).toBe(false);
    expect(matchPairs.grade(ex, {} as never).correctAnswerText).toContain("Nucleus → ");
  });

  it("schema rejects duplicate tiles and too few pairs", () => {
    const dupe = { ...ex, pairs: [...ex.pairs.slice(0, 3), { left: ex.pairs[0].left, right: "Something else" }] };
    expect(matchPairs.schema.safeParse(dupe).success).toBe(false);
    expect(matchPairs.schema.safeParse({ ...ex, pairs: ex.pairs.slice(0, 2) }).success).toBe(false);
  });

  it("autoCheck flags a pair matched to itself, case-insensitive duplicates and long tiles", () => {
    const problems = matchPairs.autoCheck?.({
      ...ex,
      pairs: [
        { left: "Mass", right: "mass" },
        { left: "Force", right: "newton" },
        { left: "force", right: "x".repeat(61) },
      ],
    });
    expect(problems).toContain("pair 1: left and right are the same text");
    expect(problems).toContain("left items contain duplicates");
    expect(problems).toContain("pair 3: right is 61 characters; keep tiles under 60");
  });

  it("columns are seeded, independent and never line up row by row", () => {
    for (let n = 3; n <= 6; n++) {
      for (let seed = 0; seed < 200; seed++) {
        const { left, right } = columnOrders(n, seed);
        expect([...left].sort()).toEqual([...right].sort());
        expect(right.some((pair, row) => pair === left[row])).toBe(false);
      }
    }
    expect(columnOrders(5, 42)).toEqual(columnOrders(5, 42));
  });
});
