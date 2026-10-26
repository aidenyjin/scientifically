"use client";

import type { ExerciseProps } from "@/content/types";
import type { Ordering, OrderingResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function OrderingView({ exercise }: ExerciseProps<Ordering, OrderingResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
