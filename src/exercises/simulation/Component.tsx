"use client";

import type { ExerciseProps } from "@/content/types";
import type { Simulation, SimulationResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function SimulationView({ exercise }: ExerciseProps<Simulation, SimulationResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
