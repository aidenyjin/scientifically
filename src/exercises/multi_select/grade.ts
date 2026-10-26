import type { GradeResult } from "@/content/types";
import type { MultiSelect, MultiSelectResponse } from "./schema";

/** Correct options in authoring order, joined for the feedback bar. */
export function multiSelectAnswerText(ex: MultiSelect): string {
  return [...ex.answerIndices]
    .sort((a, b) => a - b)
    .map((i) => ex.options[i])
    .join(", ");
}

export function gradeMultiSelect(ex: MultiSelect, res: MultiSelectResponse): GradeResult {
  const correctAnswerText = multiSelectAnswerText(ex);
  const picked = new Set(Array.isArray(res?.indices) ? res.indices : []);
  const answer = new Set(ex.answerIndices);
  const missed = [...answer].filter((i) => !picked.has(i)).length;
  const wrong = [...picked].filter((i) => !answer.has(i)).length;
  if (missed === 0 && wrong === 0) return { correct: true, correctAnswerText };

  const parts: string[] = [];
  if (wrong > 0) parts.push(`${wrong} of your picks ${wrong === 1 ? "is" : "are"} wrong`);
  if (missed > 0) parts.push(`you missed ${missed}`);
  const sentence = parts.join(" and ");
  return {
    correct: false,
    correctAnswerText,
    feedback: sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".",
  };
}

const CATCH_ALL = /\b(all|none|both|neither) of (the|these) (above|options)\b/i;

export function autoCheckMultiSelect(ex: MultiSelect): string[] {
  const problems: string[] = [];
  const normalized = ex.options.map((o) => o.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) problems.push("options contain duplicates");
  if (ex.options.some((o) => CATCH_ALL.test(o))) {
    problems.push("options must not use 'all/none of the above' (options are shuffled and multi-select)");
  }
  return problems;
}
