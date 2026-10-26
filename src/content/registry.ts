import { z } from "zod";
import { categorize } from "@/exercises/categorize";
import { dialogue } from "@/exercises/dialogue";
import { equationBalance } from "@/exercises/equation_balance";
import { fillBlank } from "@/exercises/fill_blank";
import { graphPlot } from "@/exercises/graph_plot";
import { graphRead } from "@/exercises/graph_read";
import { infoCard } from "@/exercises/info_card";
import { matchPairs } from "@/exercises/match_pairs";
import { multiSelect } from "@/exercises/multi_select";
import { multipleChoice } from "@/exercises/multiple_choice";
import { numeric } from "@/exercises/numeric";
import { ordering } from "@/exercises/ordering";
import { simulation } from "@/exercises/simulation";
import { spotError } from "@/exercises/spot_error";
import { trueFalse } from "@/exercises/true_false";
import { wordBank } from "@/exercises/word_bank";
import { categorizeSchema } from "@/exercises/categorize/schema";
import { dialogueSchema } from "@/exercises/dialogue/schema";
import { equationBalanceSchema } from "@/exercises/equation_balance/schema";
import { fillBlankSchema } from "@/exercises/fill_blank/schema";
import { graphPlotSchema } from "@/exercises/graph_plot/schema";
import { graphReadSchema } from "@/exercises/graph_read/schema";
import { infoCardSchema } from "@/exercises/info_card/schema";
import { matchPairsSchema } from "@/exercises/match_pairs/schema";
import { multiSelectSchema } from "@/exercises/multi_select/schema";
import { multipleChoiceSchema } from "@/exercises/multiple_choice/schema";
import { numericSchema } from "@/exercises/numeric/schema";
import { orderingSchema } from "@/exercises/ordering/schema";
import { simulationSchema } from "@/exercises/simulation/schema";
import { spotErrorSchema } from "@/exercises/spot_error/schema";
import { trueFalseSchema } from "@/exercises/true_false/schema";
import { wordBankSchema } from "@/exercises/word_bank/schema";
import type { ExerciseCore, GradeResult } from "./types";

/**
 * Server-safe exercise registry (no React). The client half that adds
 * components is registry.client.ts. A new type is added in three places here
 * (imports, exerciseCores, exerciseSchema) and once in registry.client.ts.
 *
 * Reserved for later (do not build yet): "free_text" (AI-marked), diagram types.
 */
export const exerciseCores = [
  infoCard,
  multipleChoice,
  trueFalse,
  multiSelect,
  fillBlank,
  wordBank,
  matchPairs,
  ordering,
  categorize,
  spotError,
  numeric,
  equationBalance,
  graphRead,
  graphPlot,
  simulation,
  dialogue,
] as const;

/** The union of every exercise JSON shape, discriminated by `type`. */
export const exerciseSchema = z.discriminatedUnion("type", [
  infoCardSchema,
  multipleChoiceSchema,
  trueFalseSchema,
  multiSelectSchema,
  fillBlankSchema,
  wordBankSchema,
  matchPairsSchema,
  orderingSchema,
  categorizeSchema,
  spotErrorSchema,
  numericSchema,
  equationBalanceSchema,
  graphReadSchema,
  graphPlotSchema,
  simulationSchema,
  dialogueSchema,
]);

export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise["type"];
export const EXERCISE_TYPES = exerciseCores.map((c) => c.type) as ExerciseType[];

/** Untyped view used for dispatch; each core is internally type-safe. */
type LooseCore = ExerciseCore<Exercise, unknown>;

const coreByType = new Map<string, LooseCore>(
  exerciseCores.map((c) => [c.type, c as unknown as LooseCore]),
);

export function getCore(type: string): LooseCore {
  const core = coreByType.get(type);
  if (!core) throw new Error(`Unknown exercise type: ${type}`);
  return core;
}

export function isGraded(exercise: Exercise): boolean {
  return getCore(exercise.type).graded !== false;
}

/** Validate the response shape, then grade. Malformed responses grade as wrong. */
export function gradeExercise(exercise: Exercise, response: unknown): GradeResult {
  const core = getCore(exercise.type);
  const parsed = core.responseSchema.safeParse(response);
  if (!parsed.success) {
    return { correct: false, correctAnswerText: core.grade(exercise, response).correctAnswerText };
  }
  return core.grade(exercise, parsed.data);
}

export function autoCheckExercise(exercise: Exercise): string[] {
  return getCore(exercise.type).autoCheck?.(exercise) ?? [];
}
