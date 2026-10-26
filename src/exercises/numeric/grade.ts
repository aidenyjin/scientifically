import type { GradeResult } from "@/content/types";
import { formatNumber, withinTolerance } from "../_shared/numbers";
import { tryEvaluate } from "./expr";
import type { Numeric, NumericResponse } from "./schema";
import { normalizeUnit, unitsMatch } from "./units";

type Tolerance = Numeric["tolerance"];

const scaled = (t: Tolerance, k: number): Tolerance => ({
  abs: t.abs === undefined ? undefined : t.abs * k,
  rel: t.rel === undefined ? undefined : t.rel * k,
});

/** "9.81 m/s^{2}" (RichText markup). */
export function numericAnswerText(ex: Pick<Numeric, "answer" | "unit">): string {
  const value = formatNumber(ex.answer);
  return ex.unit ? `${value} ${ex.unit}` : value;
}

/** Does this exercise ask the learner to pick the unit? */
export function requiresUnit(ex: Pick<Numeric, "unit" | "unitChoices">): boolean {
  return ex.unit !== undefined && (ex.unitChoices?.length ?? 0) > 0;
}

/** A targeted nudge for a near miss, or undefined. */
function nearMissFeedback(value: number, ex: Numeric): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (withinTolerance(value, ex.answer, scaled(ex.tolerance, 3)))
    return "Close! Check your rounding.";
  if (ex.answer !== 0 && withinTolerance(-value, ex.answer, ex.tolerance))
    return "Right size, wrong sign.";
  if (value !== 0 && ex.answer !== 0) {
    for (let k = 1; k <= 9; k++) {
      for (const factor of [10 ** k, 10 ** -k]) {
        if (withinTolerance(value * factor, ex.answer, ex.tolerance)) {
          return `Off by a factor of ${formatNumber(10 ** k)} — check your unit conversions and powers of ten.`;
        }
      }
    }
  }
  return undefined;
}

export function gradeNumeric(ex: Numeric, res: NumericResponse): GradeResult {
  const correctAnswerText = numericAnswerText(ex);
  const value = typeof res?.value === "number" ? res.value : NaN;
  const valueOk = withinTolerance(value, ex.answer, ex.tolerance);

  // The unit counts when the learner had to choose it, or chose one anyway.
  const unitGiven = typeof res?.unit === "string" ? res.unit : undefined;
  const unitOk =
    ex.unit === undefined ||
    (unitGiven === undefined ? !requiresUnit(ex) : unitsMatch(unitGiven, ex.unit));

  if (valueOk && unitOk) return { correct: true, correctAnswerText };
  if (valueOk)
    return { correct: false, correctAnswerText, feedback: "Right number — but check the unit." };
  const feedback = nearMissFeedback(value, ex);
  return feedback
    ? { correct: false, correctAnswerText, feedback }
    : { correct: false, correctAnswerText };
}

export function autoCheckNumeric(ex: Numeric): string[] {
  const problems: string[] = [];

  if (ex.computation) {
    const result = tryEvaluate(ex.computation.expr, ex.computation.vars);
    if (!result.ok) {
      problems.push(`computation.expr can't be evaluated: ${result.error}`);
    } else if (!withinTolerance(result.value, ex.answer, ex.tolerance)) {
      problems.push(
        `computation gives ${formatNumber(result.value)} but answer is ${formatNumber(ex.answer)} (outside tolerance)`,
      );
    }
  }

  if (ex.answer !== 0 && withinTolerance(0, ex.answer, ex.tolerance)) {
    problems.push("tolerance is so wide that 0 would be accepted");
  }

  if (ex.unit !== undefined && ex.unitChoices) {
    const seen = new Set([normalizeUnit(ex.unit)]);
    for (const choice of ex.unitChoices) {
      const key = normalizeUnit(choice);
      if (seen.has(key))
        problems.push(
          `unitChoices "${choice}" duplicates another unit (units compare case-insensitively)`,
        );
      seen.add(key);
    }
  }

  return problems;
}
