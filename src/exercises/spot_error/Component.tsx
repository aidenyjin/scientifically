"use client";

import type { ExerciseProps } from "@/content/types";
import type { SpotError, SpotErrorResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function SpotErrorView({ exercise }: ExerciseProps<SpotError, SpotErrorResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
