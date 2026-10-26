import type { ExerciseCore } from "@/content/types";
import { orderingResponseSchema, orderingSchema, type Ordering, type OrderingResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const ordering: ExerciseCore<Ordering, OrderingResponse> = {
  type: "ordering",
  label: "Put in order",
  schema: orderingSchema,
  responseSchema: orderingResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
