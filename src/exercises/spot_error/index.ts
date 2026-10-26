import type { ExerciseCore } from "@/content/types";
import { spotErrorResponseSchema, spotErrorSchema, type SpotError, type SpotErrorResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const spotError: ExerciseCore<SpotError, SpotErrorResponse> = {
  type: "spot_error",
  label: "Spot the error",
  schema: spotErrorSchema,
  responseSchema: spotErrorResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
