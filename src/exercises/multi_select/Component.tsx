"use client";

import type { ExerciseProps } from "@/content/types";
import type { MultiSelect, MultiSelectResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function MultiSelectView({ exercise }: ExerciseProps<MultiSelect, MultiSelectResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
