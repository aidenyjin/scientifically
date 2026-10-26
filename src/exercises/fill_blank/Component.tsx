"use client";

import type { ExerciseProps } from "@/content/types";
import type { FillBlank, FillBlankResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function FillBlankView({ exercise }: ExerciseProps<FillBlank, FillBlankResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
