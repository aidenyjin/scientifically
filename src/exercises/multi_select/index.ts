import type { ExerciseCore } from "@/content/types";
import { multiSelectResponseSchema, multiSelectSchema, type MultiSelect, type MultiSelectResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const multiSelect: ExerciseCore<MultiSelect, MultiSelectResponse> = {
  type: "multi_select",
  label: "Select all that apply",
  schema: multiSelectSchema,
  responseSchema: multiSelectResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
