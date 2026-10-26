import type { ExerciseCore } from "@/content/types";
import { graphReadResponseSchema, graphReadSchema, type GraphRead, type GraphReadResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const graphRead: ExerciseCore<GraphRead, GraphReadResponse> = {
  type: "graph_read",
  label: "Read the graph",
  schema: graphReadSchema,
  responseSchema: graphReadResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
