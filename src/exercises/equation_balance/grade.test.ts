import { describe, expect, it } from "vitest";
import { equationBalance } from "./index";
import type { EquationBalance } from "./schema";

const [water, methane, alum] = equationBalance.examples;
const grade = (ex: EquationBalance, coefficients: number[]) =>
  equationBalance.grade(ex, { coefficients });
const check = (ex: EquationBalance) => equationBalance.autoCheck?.(ex);

describe("equation_balance", () => {
  it("examples are valid and pass autoCheck", () => {
    expect(equationBalance.examples.length).toBeGreaterThanOrEqual(2);
    for (const ex of equationBalance.examples) {
      expect(equationBalance.schema.safeParse(ex).success, ex.id).toBe(true);
      expect(check(ex), ex.id).toEqual([]);
    }
  });

  it("grades the simplest balanced coefficients as correct", () => {
    expect(grade(water, [2, 1, 2])).toEqual({
      correct: true,
      correctAnswerText: "2H_{2} + O_{2} → 2H_{2}O",
    });
    expect(grade(methane, [1, 2, 1, 2]).correct).toBe(true);
    expect(grade(alum, [1, 3, 2, 3]).correct).toBe(true);
  });

  it("asks to simplify balanced multiples", () => {
    expect(grade(water, [4, 2, 4])).toEqual({
      correct: false,
      correctAnswerText: "2H_{2} + O_{2} → 2H_{2}O",
      feedback: "Balanced — now simplify (divide all by 2).",
    });
    expect(grade(methane, [3, 6, 3, 6]).feedback).toBe(
      "Balanced — now simplify (divide all by 3).",
    );
  });

  it("names the unbalanced elements", () => {
    expect(grade(water, [1, 1, 1])).toEqual({
      correct: false,
      correctAnswerText: "2H_{2} + O_{2} → 2H_{2}O",
      feedback: "Not balanced yet — check O.",
    });
    expect(grade(methane, [1, 1, 1, 1]).feedback).toBe("Not balanced yet — check H and O.");
    expect(grade(alum, [1, 1, 1, 1]).feedback).toBe("Not balanced yet — check Al, S, O and H.");
  });

  it("grades by atom counting, not by comparing to answer", () => {
    // A (deliberately mis-keyed) answer doesn't matter: the learner's balanced reply wins.
    expect(grade({ ...water, answer: [1, 1, 1] }, [2, 1, 2]).correct).toBe(true);
  });

  it("rejects wrong-length or non-positive coefficients without throwing", () => {
    expect(grade(water, [2, 1]).correct).toBe(false);
    expect(grade(water, [0, 0, 0]).correct).toBe(false);
    expect(equationBalance.grade(water, {} as never)).toMatchObject({ correct: false });
  });

  it("omits coefficients of 1 in the correct answer", () => {
    expect(grade(methane, [1, 1, 1, 1]).correctAnswerText).toBe(
      "CH_{4} + 2O_{2} → CO_{2} + 2H_{2}O",
    );
    expect(grade(alum, [1, 1, 1, 1]).correctAnswerText).toBe(
      "Al_{2}(SO_{4})_{3} + 3Ca(OH)_{2} → 2Al(OH)_{3} + 3CaSO_{4}",
    );
  });

  describe("autoCheck", () => {
    it("reports formulas that don't parse", () => {
      expect(check({ ...water, reactants: ["H2", "Oo2"] })).toEqual([
        'reactants[1]: unknown element "Oo" in "Oo2"',
      ]);
      expect(check({ ...water, products: ["2H2O"] })).toEqual([
        'products[0]: "2H2O" starts with a number — put coefficients in answer, not the formula',
      ]);
    });

    it("reports an answer that doesn't balance", () => {
      expect(check({ ...water, answer: [2, 2, 2] })).toEqual([
        "answer does not balance (O 4 vs 2)",
      ]);
    });

    it("reports an answer that isn't in lowest terms", () => {
      expect(check({ ...water, answer: [4, 2, 4] })).toEqual([
        "answer is not in lowest terms (every coefficient divides by 2)",
      ]);
    });

    it("reports an equation that's already balanced", () => {
      expect(
        check({ ...water, reactants: ["H2", "Cl2"], products: ["H2Cl2"], answer: [1, 1, 1] }),
      ).toContain("the equation is already balanced with every coefficient 1 — nothing to do");
    });

    it("reports elements missing from one side", () => {
      const problems = check({
        ...water,
        reactants: ["H2", "O2", "N2"],
        products: ["H2O"],
        answer: [2, 1, 1, 2],
      });
      expect(problems).toContain("N only appears in the reactants");
      expect(check({ ...water, products: ["H2O", "NaCl"], answer: [2, 1, 2, 1] })).toEqual(
        expect.arrayContaining([
          "Na only appears in the products",
          "Cl only appears in the products",
        ]),
      );
    });

    it("reports repeated species", () => {
      expect(check({ ...water, reactants: ["H2", "O2", "H2"], answer: [1, 1, 1, 2] })).toContain(
        "the same formula appears more than once",
      );
    });
  });

  it("schema requires one coefficient per species", () => {
    expect(equationBalance.schema.safeParse({ ...water, answer: [2, 1] }).success).toBe(false);
    expect(equationBalance.schema.safeParse({ ...water, reactants: ["H2 + O2"] }).success).toBe(
      false,
    );
  });
});
