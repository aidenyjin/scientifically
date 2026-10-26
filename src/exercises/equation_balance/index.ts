import type { ExerciseCore } from "@/content/types";
import { equationBalanceResponseSchema, equationBalanceSchema, type EquationBalance, type EquationBalanceResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const equationBalance: ExerciseCore<EquationBalance, EquationBalanceResponse> = {
  type: "equation_balance",
  label: "Balance the equation",
  schema: equationBalanceSchema,
  responseSchema: equationBalanceResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
