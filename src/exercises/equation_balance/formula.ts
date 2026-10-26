/**
 * Chemical formula parsing and atom counting for equation_balance.
 * Supports element symbols, counts and nested parentheses — `Ca(OH)2`,
 * `Fe2(SO4)3`, `(NH4)3PO4`. No charges, state symbols, hydrates or brackets.
 */

/** Element symbol → number of atoms, in order of first appearance. */
export type AtomCounts = Record<string, number>;

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

// prettier-ignore
const ELEMENTS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
]);

const MAX_LENGTH = 64;

/** Parse a formula into atom counts. Throws FormulaError. */
export function parseFormula(formula: string): AtomCounts {
  if (formula.length === 0) throw new FormulaError("formula is empty");
  if (formula.length > MAX_LENGTH)
    throw new FormulaError(`formula is longer than ${MAX_LENGTH} characters`);
  if (/^\d/.test(formula)) {
    throw new FormulaError(
      `"${formula}" starts with a number — put coefficients in answer, not the formula`,
    );
  }
  let i = 0;

  const readCount = (): number => {
    const match = /^\d+/.exec(formula.slice(i));
    if (!match) return 1;
    if (match[0].startsWith("0")) throw new FormulaError(`bad count "${match[0]}" in "${formula}"`);
    i += match[0].length;
    return Number(match[0]);
  };

  const group = (depth: number): AtomCounts => {
    const counts: AtomCounts = {};
    const add = (element: string, n: number) => {
      counts[element] = (counts[element] ?? 0) + n;
    };
    let empty = true;
    while (i < formula.length) {
      const ch = formula[i];
      if (ch === "(") {
        i++;
        const inner = group(depth + 1);
        if (formula[i] !== ")") throw new FormulaError(`missing ")" in "${formula}"`);
        i++;
        const n = readCount();
        for (const [element, count] of Object.entries(inner)) add(element, count * n);
      } else if (ch === ")") {
        if (depth === 0) throw new FormulaError(`unexpected ")" in "${formula}"`);
        break;
      } else if (/[A-Z]/.test(ch)) {
        const symbol = /^[A-Z][a-z]?/.exec(formula.slice(i))![0];
        if (!ELEMENTS.has(symbol))
          throw new FormulaError(`unknown element "${symbol}" in "${formula}"`);
        i += symbol.length;
        add(symbol, readCount());
      } else if (/\d/.test(ch)) {
        throw new FormulaError(`unexpected number at position ${i} in "${formula}"`);
      } else {
        throw new FormulaError(`unexpected "${ch}" in "${formula}"`);
      }
      empty = false;
    }
    if (empty && depth > 0 && i >= formula.length)
      throw new FormulaError(`missing ")" in "${formula}"`);
    if (empty)
      throw new FormulaError(
        depth === 0 ? "formula is empty" : `empty parentheses in "${formula}"`,
      );
    return counts;
  };

  return group(0);
}

/** Like parseFormula, but returns null instead of throwing. */
export function tryParseFormula(formula: string): AtomCounts | null {
  try {
    return parseFormula(formula);
  } catch (err) {
    if (err instanceof FormulaError) return null;
    throw err;
  }
}

/** Total atoms on one side of an equation: Σ coefficient × formula counts. */
export function countSide(formulas: string[], coefficients: number[]): AtomCounts {
  const total: AtomCounts = {};
  formulas.forEach((formula, k) => {
    const coefficient = coefficients[k] ?? 0;
    for (const [element, n] of Object.entries(parseFormula(formula))) {
      total[element] = (total[element] ?? 0) + n * coefficient;
    }
  });
  return total;
}

export interface AtomRow {
  element: string;
  left: number;
  right: number;
}

/**
 * One row per element, in order of first appearance (reactants first), with
 * the atom count on each side for these coefficients (reactants then products).
 */
export function atomRows(
  reactants: string[],
  products: string[],
  coefficients: number[],
): AtomRow[] {
  const left = countSide(reactants, coefficients.slice(0, reactants.length));
  const right = countSide(products, coefficients.slice(reactants.length));
  const elements = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  return elements.map((element) => ({
    element,
    left: left[element] ?? 0,
    right: right[element] ?? 0,
  }));
}

/** True when every element has the same count on both sides. Invalid input → false. */
export function isBalanced(
  reactants: string[],
  products: string[],
  coefficients: number[],
): boolean {
  if (coefficients.length !== reactants.length + products.length) return false;
  if (!coefficients.every((c) => Number.isInteger(c) && c >= 1)) return false;
  if (![...reactants, ...products].every((f) => tryParseFormula(f) !== null)) return false;
  return atomRows(reactants, products, coefficients).every((row) => row.left === row.right);
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Greatest common divisor of all numbers (0 for an empty list). */
export function gcdAll(numbers: number[]): number {
  return numbers.reduce((g, n) => gcd(g, n), 0);
}

/** RichText markup with subscripts: `Fe2(SO4)3` → `Fe_{2}(SO_{4})_{3}`. */
export function formulaToRichText(formula: string): string {
  return formula.replace(/\d+/g, (digits) => `_{${digits}}`);
}

/**
 * The whole equation as RichText, e.g. `2H_{2} + O_{2} → 2H_{2}O`.
 * Coefficients of 1 are omitted; without coefficients none are shown.
 */
export function equationToRichText(
  reactants: string[],
  products: string[],
  coefficients?: number[],
): string {
  const side = (formulas: string[], offset: number) =>
    formulas
      .map((f, k) => {
        const c = coefficients?.[offset + k];
        return `${c !== undefined && c !== 1 ? c : ""}${formulaToRichText(f)}`;
      })
      .join(" + ");
  return `${side(reactants, 0)} → ${side(products, reactants.length)}`;
}
