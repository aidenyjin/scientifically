"use client";

import type { ExerciseProps } from "@/content/types";
import type { WordBank, WordBankResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function WordBankView({ exercise }: ExerciseProps<WordBank, WordBankResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
