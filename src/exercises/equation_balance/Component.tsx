"use client";

import type { ExerciseProps } from "@/content/types";
import type { EquationBalance, EquationBalanceResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function EquationBalanceView({ exercise }: ExerciseProps<EquationBalance, EquationBalanceResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
