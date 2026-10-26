import { richTextToPlain } from "@/content/richtext";
import type { GradeResult } from "@/content/types";
import type { Categorize, CategorizeResponse } from "./schema";

/** Longest item text (markup stripped) that fits a tile inside a narrow bin. */
export const MAX_ITEM_CHARS = 40;

const norm = (text: string) => richTextToPlain(text).trim().replace(/\s+/g, " ").toLowerCase();

/** "Metals: iron, copper · Non-metals: sulfur, oxygen" */
export function describeCategories(ex: Categorize): string {
  return ex.categories
    .map((c) => {
      const members = ex.items.filter((it) => it.categoryId === c.id).map((it) => it.text);
      return `${c.label}: ${members.join(", ")}`;
    })
    .join(" · ");
}

export function gradeCategorize(ex: Categorize, res: CategorizeResponse): GradeResult {
  const assignments = Array.isArray(res.assignments) ? res.assignments : [];
  const complete = assignments.length === ex.items.length;
  const wrong = ex.items.filter((it, i) => assignments[i] !== it.categoryId).length;
  const result: GradeResult = { correct: complete && wrong === 0, correctAnswerText: describeCategories(ex) };
  if (complete && wrong > 0) {
    result.feedback = `${wrong} of ${ex.items.length} ${wrong === 1 ? "item is" : "items are"} in the wrong group`;
  }
  return result;
}

export function autoCheckCategorize(ex: Categorize): string[] {
  const problems: string[] = [];
  const texts = ex.items.map((it) => norm(it.text));
  if (new Set(texts).size !== texts.length) problems.push("items contain duplicate texts");
  const labels = ex.categories.map((c) => norm(c.label));
  if (new Set(labels).size !== labels.length) problems.push("categories contain duplicate labels");
  ex.items.forEach((it, i) => {
    const length = richTextToPlain(it.text).length;
    if (length > MAX_ITEM_CHARS) problems.push(`item ${i + 1} is ${length} characters; keep items under ${MAX_ITEM_CHARS}`);
  });
  return problems;
}
