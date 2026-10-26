import type { GradeResult } from "@/content/types";
import { formatNumber, withinTolerance } from "../_shared/numbers";
import type { GraphRead, GraphReadResponse } from "./schema";
import { extent } from "./ticks";

function answerText(ex: GraphRead): string {
  const q = ex.question;
  if (q.mode === "choice") return q.options[q.answerIndex] ?? "";
  return q.unit ? `${formatNumber(q.answer)} ${q.unit}` : formatNumber(q.answer);
}

export function gradeGraphRead(ex: GraphRead, res: GraphReadResponse): GradeResult {
  const q = ex.question;
  const correctAnswerText = answerText(ex);
  // Defensive: the player may pass an unparsed response when the learner skips.
  if (!res || typeof res !== "object") return { correct: false, correctAnswerText };
  if (q.mode === "choice") {
    return { correct: res.mode === "choice" && res.index === q.answerIndex, correctAnswerText };
  }
  return {
    correct: res.mode === "numeric" && withinTolerance(res.value, q.answer, q.tolerance),
    correctAnswerText,
  };
}

export function autoCheckGraphRead(ex: GraphRead): string[] {
  const problems: string[] = [];
  const { chart, question: q } = ex;
  const points = chart.series.flatMap((s) => s.points);

  if (q.mode === "choice") {
    if (q.answerIndex >= q.options.length) problems.push("answerIndex must point at an option");
    const normalized = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) problems.push("options contain duplicates");
  } else {
    // Numeric answers must be read off the chart: a y value (or an x value) that is plotted.
    const [yMin, yMax] = extent(points.map(([, y]) => y));
    const [xMin, xMax] = extent(points.map(([x]) => x));
    const inside = (v: number, lo: number, hi: number) => v >= lo - 1e-9 && v <= hi + 1e-9;
    if (!inside(q.answer, yMin, yMax) && !inside(q.answer, xMin, xMax)) {
      problems.push(
        `numeric answer ${q.answer} lies outside the plotted y range [${yMin}, ${yMax}] (and x range); ` +
          "numeric questions must be read directly off the chart — use choice mode for gradients or areas",
      );
    }
  }

  if (chart.xCategories) {
    if (chart.kind !== "bar") problems.push("xCategories is only for bar charts");
    chart.series.forEach((s) => {
      if (s.points.length !== chart.xCategories!.length) {
        problems.push(
          `series "${s.name}" has ${s.points.length} points but xCategories has ${chart.xCategories!.length} labels`,
        );
      }
      if (s.points.some(([x], i) => x !== i)) {
        problems.push(`series "${s.name}": with xCategories, x values must be 0, 1, 2… in order`);
      }
    });
  }

  if (chart.kind === "bar" && chart.series.length > 1 && !chart.xCategories) {
    const xs = chart.series.map((s) => s.points.map(([x]) => x).join(","));
    if (new Set(xs).size > 1) problems.push("bar chart series must share the same x values");
  }

  const names = chart.series.map((s) => s.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) problems.push("series names must be unique");

  return problems;
}
