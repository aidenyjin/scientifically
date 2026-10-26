import type { GradeResult } from "@/content/types";
import type { MultipleChoice, MultipleChoiceResponse } from "./schema";

export function gradeMultipleChoice(ex: MultipleChoice, res: MultipleChoiceResponse): GradeResult {
  return {
    correct: res.index === ex.answerIndex,
    correctAnswerText: ex.options[ex.answerIndex],
  };
}

export function autoCheckMultipleChoice(ex: MultipleChoice): string[] {
  const problems: string[] = [];
  const normalized = ex.options.map((o) => o.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) problems.push("options contain duplicates");
  return problems;
}
