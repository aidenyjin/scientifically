import type { GradeResult } from "@/content/types";
import type { TrueFalse, TrueFalseResponse } from "./schema";

export function gradeTrueFalse(ex: TrueFalse, res: TrueFalseResponse): GradeResult {
  return { correct: res.value === ex.answer, correctAnswerText: ex.answer ? "True" : "False" };
}
