import type { ExerciseCore } from "@/content/types";
import { categorizeResponseSchema, categorizeSchema, type Categorize, type CategorizeResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const categorize: ExerciseCore<Categorize, CategorizeResponse> = {
  type: "categorize",
  label: "Sort into groups",
  schema: categorizeSchema,
  responseSchema: categorizeResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
