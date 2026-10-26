"use client";

import type { ExerciseProps } from "@/content/types";
import type { GraphRead, GraphReadResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function GraphReadView({ exercise }: ExerciseProps<GraphRead, GraphReadResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
