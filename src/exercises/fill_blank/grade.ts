import { richTextToPlain } from "@/content/richtext";
import type { GradeResult } from "@/content/types";
import { normalizeAnswer, splitBlanks } from "../_shared/blanks";
import type { FillBlank, FillBlankResponse } from "./schema";
import { isForgivableTypo } from "./typos";

export type BlankMark = {
  correct: boolean;
  /** Set when the value was accepted as a one-letter slip of this answer. */
  typoOf?: string;
};

type Blank = FillBlank["blanks"][number];

/** Accepted answers in normalised form, plus their markup-free version (CO_{2} → co2). */
function acceptedForms(blank: Blank): string[] {
  const cs = blank.caseSensitive ?? false;
  return blank.accepted.flatMap((a) => [normalizeAnswer(a, cs), normalizeAnswer(richTextToPlain(a), cs)]);
}

/** Grade each blank on its own. Pure; the UI uses it to colour the inputs. */
export function markBlanks(ex: FillBlank, values: readonly string[]): BlankMark[] {
  return ex.blanks.map((blank, i) => {
    const cs = blank.caseSensitive ?? false;
    const typed = normalizeAnswer(typeof values[i] === "string" ? values[i] : "", cs);
    if (!typed) return { correct: false };
    if (acceptedForms(blank).includes(typed)) return { correct: true };
    if (!cs) {
      const near = blank.accepted.find((a) => isForgivableTypo(typed, normalizeAnswer(richTextToPlain(a))));
      if (near) return { correct: true, typoOf: near };
    }
    return { correct: false };
  });
}

/** The sentence with every blank filled by its first accepted answer (in bold). */
export function filledSentence(ex: FillBlank): string {
  return splitBlanks(ex.text)
    .map((piece, i) => (i < ex.blanks.length ? `${piece}**${ex.blanks[i].accepted[0]}**` : piece))
    .join("");
}

export function gradeFillBlank(ex: FillBlank, res: FillBlankResponse): GradeResult {
  const correctAnswerText = filledSentence(ex);
  const values = Array.isArray(res?.values) ? res.values : [];
  const marks = markBlanks(ex, values);
  const correct = marks.every((m) => m.correct);
  const typos = marks.flatMap((m) => (m.typoOf ? [richTextToPlain(m.typoOf)] : []));
  return {
    correct,
    correctAnswerText,
    ...(typos.length > 0 ? { feedback: `Watch the spelling: ${typos.join(", ")}` } : {}),
  };
}

export function autoCheckFillBlank(ex: FillBlank): string[] {
  const problems: string[] = [];
  ex.blanks.forEach((blank, i) => {
    const cs = blank.caseSensitive ?? false;
    const normalized = blank.accepted.map((a) => normalizeAnswer(a, cs));
    if (normalized.some((a) => a === "")) problems.push(`blank ${i + 1} has an empty accepted answer`);
    if (new Set(normalized).size !== normalized.length) {
      problems.push(`blank ${i + 1} has duplicate accepted answers`);
    }
  });
  return problems;
}
