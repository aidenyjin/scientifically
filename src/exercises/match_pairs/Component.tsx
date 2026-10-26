"use client";

import type { ExerciseProps } from "@/content/types";
import type { MatchPairs, MatchPairsResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function MatchPairsView({ exercise }: ExerciseProps<MatchPairs, MatchPairsResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
