import type { ExerciseCore } from "@/content/types";
import { wordBankResponseSchema, wordBankSchema, type WordBank, type WordBankResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const wordBank: ExerciseCore<WordBank, WordBankResponse> = {
  type: "word_bank",
  label: "Word bank",
  schema: wordBankSchema,
  responseSchema: wordBankResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
