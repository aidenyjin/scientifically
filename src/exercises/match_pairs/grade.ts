import { richTextToPlain } from "@/content/richtext";
import type { GradeResult } from "@/content/types";
import type { MatchPairs, MatchPairsResponse } from "./schema";

/** Longest tile text (markup stripped) that still fits a half-width tile comfortably. */
export const MAX_TILE_CHARS = 60;

const norm = (text: string) => richTextToPlain(text).trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The UI only finishes once every pair is matched, so a valid response is
 * always correct. `mistakes` is recorded for spaced repetition and feedback.
 */
export function gradeMatchPairs(ex: MatchPairs, res: MatchPairsResponse): GradeResult {
  const result: GradeResult = {
    correct: true,
    correctAnswerText: ex.pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
  };
  const mistakes = res.mistakes;
  if (mistakes > 0) result.feedback = `Matched with ${mistakes} ${mistakes === 1 ? "slip" : "slips"}`;
  return result;
}

export function autoCheckMatchPairs(ex: MatchPairs): string[] {
  const problems: string[] = [];
  ex.pairs.forEach((p, i) => {
    if (norm(p.left) === norm(p.right)) problems.push(`pair ${i + 1}: left and right are the same text`);
    for (const side of ["left", "right"] as const) {
      const length = richTextToPlain(p[side]).length;
      if (length > MAX_TILE_CHARS) {
        problems.push(`pair ${i + 1}: ${side} is ${length} characters; keep tiles under ${MAX_TILE_CHARS}`);
      }
    }
  });
  for (const side of ["left", "right"] as const) {
    const texts = ex.pairs.map((p) => norm(p[side]));
    if (new Set(texts).size !== texts.length) problems.push(`${side} items contain duplicates`);
  }
  return problems;
}
