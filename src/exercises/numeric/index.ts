import type { ExerciseCore } from "@/content/types";
import { numericResponseSchema, numericSchema, type Numeric, type NumericResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const numeric: ExerciseCore<Numeric, NumericResponse> = {
  type: "numeric",
  label: "Numeric answer",
  schema: numericSchema,
  responseSchema: numericResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
