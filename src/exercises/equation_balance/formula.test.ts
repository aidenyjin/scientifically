import { describe, expect, it } from "vitest";
import {
  atomRows,
  countSide,
  equationToRichText,
  FormulaError,
  formulaToRichText,
  gcd,
  gcdAll,
  isBalanced,
  parseFormula,
  tryParseFormula,
} from "./formula";

describe("parseFormula", () => {
  it.each([
    ["H", { H: 1 }],
    ["H2", { H: 2 }],
    ["O2", { O: 2 }],
    ["H2O", { H: 2, O: 1 }],
    ["CO2", { C: 1, O: 2 }],
    ["Co", { Co: 1 }],
    ["NaCl", { Na: 1, Cl: 1 }],
    ["CH4", { C: 1, H: 4 }],
    ["C6H12O6", { C: 6, H: 12, O: 6 }],
    ["C12H22O11", { C: 12, H: 22, O: 11 }],
    ["Ca(OH)2", { Ca: 1, O: 2, H: 2 }],
    ["Fe2(SO4)3", { Fe: 2, S: 3, O: 12 }],
    ["(NH4)3PO4", { N: 3, H: 12, P: 1, O: 4 }],
    ["Al2(SO4)3", { Al: 2, S: 3, O: 12 }],
    ["Mg(NO3)2", { Mg: 1, N: 2, O: 6 }],
    ["(NH4)2SO4", { N: 2, H: 8, S: 1, O: 4 }],
    ["CH3COOH", { C: 2, H: 4, O: 2 }],
    ["Ca3(PO4)2", { Ca: 3, P: 2, O: 8 }],
    ["K4(Fe(CN)6)", { K: 4, Fe: 1, C: 6, N: 6 }],
    ["((CH3)3C)2O", { C: 8, H: 18, O: 1 }],
    ["Fe3O4", { Fe: 3, O: 4 }],
    ["U", { U: 1 }],
  ])("%s", (formula, expected) => {
    expect(parseFormula(formula)).toEqual(expected);
  });

  it("keeps elements in order of first appearance", () => {
    expect(Object.keys(parseFormula("NaHCO3"))).toEqual(["Na", "H", "C", "O"]);
    expect(Object.keys(parseFormula("(NH4)3PO4"))).toEqual(["N", "H", "P", "O"]);
  });

  it.each([
    ["", /empty/],
    ["2H2O", /starts with a number/],
    ["h2o", /unexpected "h"/],
    ["H2o", /unexpected "o"/],
    ["Xx", /unknown element "Xx"/],
    ["Na2So4", /unknown element "So"/],
    ["Q", /unknown element "Q"/],
    ["H0", /bad count "0"/],
    ["H02", /bad count "02"/],
    ["(OH)0", /bad count/],
    ["Ca(OH2", /missing "\)"/],
    ["CaOH)2", /unexpected "\)"/],
    ["()", /empty parentheses/],
    ["Ca()2", /empty parentheses/],
    ["H2O+", /unexpected "\+"/],
    ["Fe3+", /unexpected "\+"/],
    ["CuSO4·5H2O", /unexpected "·"/],
    ["H2O(l)", /unexpected "l"/],
    ["[Fe(CN)6]", /unexpected "\["/],
    ["Ca(OH)2(", /missing "\)"/],
    ["C".repeat(65), /longer than/],
  ])("rejects %j", (formula, message) => {
    expect(() => parseFormula(formula)).toThrow(FormulaError);
    expect(() => parseFormula(formula)).toThrow(message);
  });

  it("tryParseFormula returns null for bad formulas", () => {
    expect(tryParseFormula("H2O")).toEqual({ H: 2, O: 1 });
    expect(tryParseFormula("H2O(")).toBeNull();
  });
});

describe("atom counting", () => {
  it("counts a side with coefficients", () => {
    expect(countSide(["CH4", "O2"], [1, 2])).toEqual({ C: 1, H: 4, O: 4 });
    expect(countSide(["CO2", "H2O"], [1, 2])).toEqual({ C: 1, O: 4, H: 4 });
  });

  it("builds atom rows for both sides", () => {
    expect(atomRows(["H2", "O2"], ["H2O"], [1, 1, 1])).toEqual([
      { element: "H", left: 2, right: 2 },
      { element: "O", left: 2, right: 1 },
    ]);
    expect(atomRows(["Na"], ["NaCl"], [1, 1])).toEqual([
      { element: "Na", left: 1, right: 1 },
      { element: "Cl", left: 0, right: 1 },
    ]);
  });

  it("checks balance", () => {
    expect(isBalanced(["H2", "O2"], ["H2O"], [2, 1, 2])).toBe(true);
    expect(isBalanced(["H2", "O2"], ["H2O"], [4, 2, 4])).toBe(true);
    expect(isBalanced(["H2", "O2"], ["H2O"], [1, 1, 1])).toBe(false);
    expect(isBalanced(["CH4", "O2"], ["CO2", "H2O"], [1, 2, 1, 2])).toBe(true);
    expect(isBalanced(["C6H12O6", "O2"], ["CO2", "H2O"], [1, 6, 6, 6])).toBe(true);
    expect(isBalanced(["Fe2O3", "CO"], ["Fe", "CO2"], [1, 3, 2, 3])).toBe(true);
    expect(isBalanced(["Al2(SO4)3", "Ca(OH)2"], ["Al(OH)3", "CaSO4"], [1, 3, 2, 3])).toBe(true);
    expect(isBalanced(["(NH4)3PO4", "NaOH"], ["Na3PO4", "NH3", "H2O"], [1, 3, 1, 3, 3])).toBe(true);
  });

  it("isBalanced rejects bad input instead of throwing", () => {
    expect(isBalanced(["H2", "O2"], ["H2O"], [2, 1])).toBe(false);
    expect(isBalanced(["H2", "O2"], ["H2O"], [0, 0, 0])).toBe(false);
    expect(isBalanced(["H2", "O2"], ["H2O"], [2, 1.5, 2])).toBe(false);
    expect(isBalanced(["H2", "Oo"], ["H2O"], [2, 1, 2])).toBe(false);
  });

  it("computes gcds", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 3)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcdAll([2, 4, 6])).toBe(2);
    expect(gcdAll([4, 2, 4])).toBe(2);
    expect(gcdAll([2, 1, 2])).toBe(1);
    expect(gcdAll([3, 9, 6, 12])).toBe(3);
    expect(gcdAll([5])).toBe(5);
    expect(gcdAll([])).toBe(0);
  });
});

describe("rendering", () => {
  it("turns counts into RichText subscripts", () => {
    expect(formulaToRichText("Fe2(SO4)3")).toBe("Fe_{2}(SO_{4})_{3}");
    expect(formulaToRichText("C12H22O11")).toBe("C_{12}H_{22}O_{11}");
    expect(formulaToRichText("NaCl")).toBe("NaCl");
  });

  it("writes whole equations, omitting coefficients of 1", () => {
    expect(equationToRichText(["H2", "O2"], ["H2O"], [2, 1, 2])).toBe("2H_{2} + O_{2} → 2H_{2}O");
    expect(equationToRichText(["CH4", "O2"], ["CO2", "H2O"])).toBe(
      "CH_{4} + O_{2} → CO_{2} + H_{2}O",
    );
  });
});
