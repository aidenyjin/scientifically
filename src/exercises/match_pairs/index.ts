import type { ExerciseCore } from "@/content/types";
import { matchPairsResponseSchema, matchPairsSchema, type MatchPairs, type MatchPairsResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const matchPairs: ExerciseCore<MatchPairs, MatchPairsResponse> = {
  type: "match_pairs",
  label: "Match pairs",
  schema: matchPairsSchema,
  responseSchema: matchPairsResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
