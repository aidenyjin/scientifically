"use client";

import type { ExerciseProps } from "@/content/types";
import type { Categorize, CategorizeResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function CategorizeView({ exercise }: ExerciseProps<Categorize, CategorizeResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
