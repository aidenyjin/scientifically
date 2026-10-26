"use client";

import type { ExerciseProps } from "@/content/types";
import type { GraphPlot, GraphPlotResponse } from "./schema";

// STUB — replace with the real UI. See multiple_choice/Component.tsx for the pattern.
export function GraphPlotView({ exercise }: ExerciseProps<GraphPlot, GraphPlotResponse>) {
  return <p className="text-muted">{exercise.type} is not implemented yet.</p>;
}
