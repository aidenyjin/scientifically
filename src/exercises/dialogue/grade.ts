import type { GradeResult } from "@/content/types";
import type { Dialogue, DialogueResponse } from "./schema";

export function gradeDialogue(ex: Dialogue, res: DialogueResponse): GradeResult {
  return {
    correct: res?.index === ex.question.answerIndex,
    correctAnswerText: ex.question.options[ex.question.answerIndex],
  };
}

export function autoCheckDialogue(ex: Dialogue): string[] {
  const problems: string[] = [];
  const normalized = ex.question.options.map((o) => o.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length)
    problems.push("question.options contain duplicates");
  // Only multi-word answers: a one-word option ("Water") can fairly appear in the scene.
  const answer = normalized[ex.question.answerIndex];
  if (
    answer &&
    answer.split(/\s+/).length >= 3 &&
    ex.lines.some((line) => line.text.toLowerCase().includes(answer))
  ) {
    problems.push("a line gives away the correct option word for word");
  }
  return problems;
}
