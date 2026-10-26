import type { GradeResult } from "@/content/types";
import { splitBlanks } from "../_shared/blanks";
import type { WordBank, WordBankResponse } from "./schema";

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

/** The sentence with each blank filled by its answer tile (in bold). */
export function wordBankAnswerText(ex: WordBank): string {
  return splitBlanks(ex.text)
    .map((piece, i) => (i < ex.answers.length ? `${piece}**${ex.answers[i]}**` : piece))
    .join("");
}

/** Per-slot correctness, used by the UI after a check. */
export function markSlots(ex: WordBank, tiles: readonly string[]): boolean[] {
  return ex.answers.map((answer, i) => typeof tiles[i] === "string" && norm(tiles[i]) === norm(answer));
}

export function gradeWordBank(ex: WordBank, res: WordBankResponse): GradeResult {
  const tiles = Array.isArray(res?.tiles) ? res.tiles : [];
  return {
    correct: tiles.length === ex.answers.length && markSlots(ex, tiles).every(Boolean),
    correctAnswerText: wordBankAnswerText(ex),
  };
}

export function autoCheckWordBank(ex: WordBank): string[] {
  const problems: string[] = [];
  const key = (s: string) => norm(s).toLowerCase();
  const answers = new Set(ex.answers.map(key));
  const clashes = ex.distractors.filter((d) => answers.has(key(d)));
  if (clashes.length > 0) problems.push(`distractors duplicate answers: ${clashes.join(", ")}`);
  const distractors = ex.distractors.map(key);
  if (new Set(distractors).size !== distractors.length) problems.push("distractors contain duplicates");
  return problems;
}
