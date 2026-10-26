import type { GradeResult } from "@/content/types";
import {
  atomRows,
  equationToRichText,
  FormulaError,
  gcdAll,
  isBalanced,
  parseFormula,
} from "./formula";
import type { EquationBalance, EquationBalanceResponse } from "./schema";

const listOf = (items: string[]) =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** Graded by counting atoms, so any balanced, fully simplified answer is right. */
export function gradeEquationBalance(
  ex: EquationBalance,
  res: EquationBalanceResponse,
): GradeResult {
  const correctAnswerText = equationToRichText(ex.reactants, ex.products, ex.answer);
  const coefficients = Array.isArray(res?.coefficients) ? res.coefficients : [];
  const species = ex.reactants.length + ex.products.length;
  if (
    coefficients.length !== species ||
    !coefficients.every((c) => Number.isInteger(c) && c >= 1)
  ) {
    return { correct: false, correctAnswerText };
  }

  if (!isBalanced(ex.reactants, ex.products, coefficients)) {
    const off = unbalancedElements(ex, coefficients);
    const feedback = off.length ? `Not balanced yet — check ${listOf(off)}.` : undefined;
    return feedback
      ? { correct: false, correctAnswerText, feedback }
      : { correct: false, correctAnswerText };
  }

  const divisor = gcdAll(coefficients);
  if (divisor > 1) {
    return {
      correct: false,
      correctAnswerText,
      feedback: `Balanced — now simplify (divide all by ${divisor}).`,
    };
  }
  return { correct: true, correctAnswerText };
}

export function autoCheckEquationBalance(ex: EquationBalance): string[] {
  const problems: string[] = [];
  const all = [...ex.reactants, ...ex.products];

  ex.reactants.forEach((f, i) => checkFormula(f, `reactants[${i}]`, problems));
  ex.products.forEach((f, i) => checkFormula(f, `products[${i}]`, problems));
  if (problems.length) return problems;

  if (new Set(all).size !== all.length) problems.push("the same formula appears more than once");

  if (ex.answer.length !== all.length) {
    problems.push(
      `answer has ${ex.answer.length} coefficients but there are ${all.length} species`,
    );
    return problems;
  }

  const ones = all.map(() => 1);
  const rows = atomRows(ex.reactants, ex.products, ones);
  for (const row of rows) {
    if (row.left === 0) problems.push(`${row.element} only appears in the products`);
    if (row.right === 0) problems.push(`${row.element} only appears in the reactants`);
  }

  if (!isBalanced(ex.reactants, ex.products, ex.answer)) {
    const off = atomRows(ex.reactants, ex.products, ex.answer)
      .filter((row) => row.left !== row.right)
      .map((row) => `${row.element} ${row.left} vs ${row.right}`);
    problems.push(`answer does not balance (${off.join(", ")})`);
  } else {
    const divisor = gcdAll(ex.answer);
    if (divisor > 1)
      problems.push(`answer is not in lowest terms (every coefficient divides by ${divisor})`);
  }

  if (isBalanced(ex.reactants, ex.products, ones)) {
    problems.push("the equation is already balanced with every coefficient 1 — nothing to do");
  }

  return problems;
}

function unbalancedElements(ex: EquationBalance, coefficients: number[]): string[] {
  try {
    return atomRows(ex.reactants, ex.products, coefficients)
      .filter((row) => row.left !== row.right)
      .map((row) => row.element);
  } catch (err) {
    if (err instanceof FormulaError) return []; // a broken exercise; autoCheck reports it
    throw err;
  }
}

function checkFormula(formula: string, path: string, problems: string[]) {
  try {
    parseFormula(formula);
  } catch (err) {
    if (!(err instanceof FormulaError)) throw err;
    problems.push(`${path}: ${err.message}`);
  }
}
