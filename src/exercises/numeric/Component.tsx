"use client";

import type { ExerciseProps } from "@/content/types";
import type { Numeric, NumericResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function NumericView({ exercise }: ExerciseProps<Numeric, NumericResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
