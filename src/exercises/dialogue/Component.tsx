"use client";

import type { ExerciseProps } from "@/content/types";
import type { Dialogue, DialogueResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function DialogueView({ exercise }: ExerciseProps<Dialogue, DialogueResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
