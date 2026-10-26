import type { GradeResult } from "@/content/types";
import { getSimModel, resolveParams, SIM_MODELS } from "@/sims/models";
import { searchSettings, snapToParam } from "@/sims/search";
import type { SimModel } from "@/sims/types";
import { describeSetting, formatOutputValue, outputOf, withUnit } from "./format";
import type { Simulation, SimulationResponse } from "./schema";

/** The learner's slider values: adjustable params only, clamped and snapped to their sliders. */
export function chosenParams(model: SimModel, ex: Simulation, raw: unknown): Record<string, number> {
  const start = resolveParams(model, ex.fixed);
  const given = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, number> = {};
  for (const name of ex.adjustable) {
    const p = model.params.find((q) => q.name === name);
    if (!p) continue;
    const v = given[name];
    out[name] = typeof v === "number" ? snapToParam(p, v) : start[name];
  }
  return out;
}

/** Run the model for a response; returns the goal output value. */
export function goalValue(model: SimModel, ex: Simulation, chosen: Record<string, number>): number {
  return model.run(resolveParams(model, ex.fixed, chosen))[ex.goal.output];
}

export function gradeSimulation(ex: Simulation, res: SimulationResponse): GradeResult {
  const model = getSimModel(ex.modelId);
  if (!model) return { correct: false, correctAnswerText: `(unknown simulation "${ex.modelId}")` };
  const { goal } = ex;
  // Defensive: the player may pass an unparsed response when the learner skips.
  const chosen = chosenParams(model, ex, res?.params);
  const value = goalValue(model, ex, chosen);
  const correct = Number.isFinite(value) && Math.abs(value - goal.target) <= goal.tolerance + 1e-9;

  const search = searchSettings(model, ex.fixed, ex.adjustable, goal, { reference: chosen });
  const working = correct ? chosen : search.solution;
  const correctAnswerText = working
    ? describeSetting(model, working, goal.output, correct ? value : search.solutionValue!, goal.tolerance)
    : `Aim for ${withUnit(String(goal.target), outputOf(model, goal.output)?.unit ?? "")}`;

  if (correct) return { correct, correctAnswerText };
  const out = outputOf(model, goal.output);
  const diff = Math.abs(value - goal.target);
  return {
    correct,
    correctAnswerText,
    feedback: `Your setting gives ${withUnit(formatOutputValue(value, goal.tolerance), out?.unit ?? "")}, ${withUnit(
      formatOutputValue(diff, goal.tolerance),
      out?.unit ?? "",
    )} too ${value > goal.target ? "high" : "low"}.`,
  };
}

export function autoCheckSimulation(ex: Simulation): string[] {
  const model = getSimModel(ex.modelId);
  if (!model) return [`unknown modelId "${ex.modelId}"; use one of: ${SIM_MODELS.map((m) => m.id).join(", ")}`];
  const problems: string[] = [];
  const names = model.params.map((p) => p.name);
  const paramList = names.join(", ");

  for (const name of ex.adjustable) {
    if (!names.includes(name)) problems.push(`adjustable "${name}" is not a ${model.id} param (${paramList})`);
  }
  if (new Set(ex.adjustable).size !== ex.adjustable.length) problems.push("adjustable lists a param twice");
  for (const [name, value] of Object.entries(ex.fixed)) {
    const p = model.params.find((q) => q.name === name);
    if (!p) problems.push(`fixed "${name}" is not a ${model.id} param (${paramList})`);
    else if (value < p.min || value > p.max) problems.push(`fixed ${name} = ${value} is outside ${p.min}–${p.max} ${p.unit}`);
  }
  const out = outputOf(model, ex.goal.output);
  if (!out) {
    problems.push(`goal.output "${ex.goal.output}" is not a ${model.id} output (${model.outputs.map((o) => o.name).join(", ")})`);
  }
  if (problems.length > 0) return problems;

  const { goal } = ex;
  if (goal.tolerance > Math.abs(goal.target) * 0.2) {
    problems.push(`tolerance ${goal.tolerance} is more than 20% of the target; tighten it so the learner must reason`);
  }

  const startValue = goalValue(model, ex, chosenParams(model, ex, {}));
  if (Math.abs(startValue - goal.target) <= goal.tolerance + 1e-9) {
    problems.push(
      `the starting sliders already give ${goal.output} = ${formatOutputValue(startValue, goal.tolerance)}, inside the goal; ` +
        "change the target or set a different starting value via fixed",
    );
  }

  const search = searchSettings(model, ex.fixed, ex.adjustable, goal);
  if (!search.solution) {
    problems.push(
      `target ${goal.output} = ${goal.target} ± ${goal.tolerance} can't be reached with the sliders; ` +
        `the closest is ${formatOutputValue(search.closestValue, goal.tolerance)} ${out!.unit}`,
    );
  }
  return problems;
}
