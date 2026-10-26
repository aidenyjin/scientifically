import type { ExerciseCore } from "@/content/types";
import { fillBlankResponseSchema, fillBlankSchema, type FillBlank, type FillBlankResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const fillBlank: ExerciseCore<FillBlank, FillBlankResponse> = {
  type: "fill_blank",
  label: "Fill in the blank",
  schema: fillBlankSchema,
  responseSchema: fillBlankResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
