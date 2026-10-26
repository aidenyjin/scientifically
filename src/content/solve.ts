import { getSimModel } from "@/sims/models";
import { searchSettings } from "@/sims/search";
import type { Exercise } from "./registry";

/**
 * A correct response for any exercise — the "answer key" in response form.
 * Used by tests (every example must be solvable) and by end-to-end tests to
 * play lessons. Never shown to learners.
 */
export function solve(ex: Exercise): unknown {
  switch (ex.type) {
    case "info_card":
      return {};
    case "multiple_choice":
      return { index: ex.answerIndex };
    case "true_false":
      return { value: ex.answer };
    case "multi_select":
      return { indices: [...ex.answerIndices] };
    case "fill_blank":
      return { values: ex.blanks.map((b) => b.accepted[0]) };
    case "word_bank":
      return { tiles: [...ex.answers] };
    case "match_pairs":
      return { mistakes: 0 };
    case "ordering":
      return { order: ex.items.map((_, i) => i) };
    case "categorize":
      return { assignments: ex.items.map((i) => i.categoryId) };
    case "spot_error":
      return { index: ex.errorIndex };
    case "numeric":
      return { value: ex.answer, unit: ex.unitChoices ? ex.unit : undefined };
    case "equation_balance":
      return { coefficients: [...ex.answer] };
    case "graph_read":
      return ex.question.mode === "choice"
        ? { mode: "choice", index: ex.question.answerIndex }
        : { mode: "numeric", value: ex.question.answer };
    case "graph_plot":
      return { points: ex.points.map(([x, y]) => [x, y]) };
    case "simulation": {
      const model = getSimModel(ex.modelId);
      if (!model) return { params: {} };
      const found = searchSettings(model, ex.fixed, ex.adjustable, ex.goal);
      return { params: found.solution ?? found.closest };
    }
    case "dialogue":
      return { index: ex.question.answerIndex };
  }
}
