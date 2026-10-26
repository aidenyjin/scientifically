import { richTextToPlain } from "@/content/richtext";
import type { GradeResult } from "@/content/types";
import type { SpotError, SpotErrorResponse } from "./schema";

export function gradeSpotError(ex: SpotError, res: SpotErrorResponse): GradeResult {
  return {
    correct: res?.index === ex.errorIndex,
    correctAnswerText: ex.correction,
    // The feedback bar shows feedback as plain text, so strip markup.
    feedback: `${richTextToPlain(ex.segments[ex.errorIndex])} → ${richTextToPlain(ex.correction)}`,
  };
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function autoCheckSpotError(ex: SpotError): string[] {
  const problems: string[] = [];
  const segments = ex.segments.map(norm);
  if (new Set(segments).size !== segments.length) problems.push("segments contain duplicates");
  if (norm(ex.correction) === segments[ex.errorIndex]) problems.push("correction is the same as the error segment");
  if (segments.some((s, i) => i !== ex.errorIndex && s === norm(ex.correction))) {
    problems.push("correction repeats another segment");
  }
  return problems;
}
