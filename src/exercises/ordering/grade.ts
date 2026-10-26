import { richTextToPlain } from "@/content/richtext";
import type { GradeResult } from "@/content/types";
import type { Ordering, OrderingResponse } from "./schema";

/** Longest card text (markup stripped) before it wraps awkwardly. */
export const MAX_CARD_CHARS = 90;

/** How many cards sit in their correct position. */
export function countInPlace(ex: Ordering, order: readonly number[]): number {
  return ex.items.reduce((n, _, position) => n + (order[position] === position ? 1 : 0), 0);
}

export function gradeOrdering(ex: Ordering, res: OrderingResponse): GradeResult {
  const correctAnswerText = ex.items.join(" → ");
  const order = Array.isArray(res.order) ? res.order : [];
  const correct = order.length === ex.items.length && order.every((item, position) => item === position);
  const result: GradeResult = { correct, correctAnswerText };
  if (!correct && order.length === ex.items.length) {
    result.feedback = `${countInPlace(ex, order)} of ${ex.items.length} in the right place`;
  }
  return result;
}

export function autoCheckOrdering(ex: Ordering): string[] {
  const problems: string[] = [];
  const plain = ex.items.map((item) => richTextToPlain(item).trim().replace(/\s+/g, " ").toLowerCase());
  if (new Set(plain).size !== plain.length) problems.push("items contain duplicates");
  ex.items.forEach((item, i) => {
    const length = richTextToPlain(item).length;
    if (length > MAX_CARD_CHARS) problems.push(`item ${i + 1} is ${length} characters; keep cards under ${MAX_CARD_CHARS}`);
  });
  return problems;
}
