import type { ExerciseCore } from "@/content/types";
import { simulationResponseSchema, simulationSchema, type Simulation, type SimulationResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const simulation: ExerciseCore<Simulation, SimulationResponse> = {
  type: "simulation",
  label: "Simulation",
  schema: simulationSchema,
  responseSchema: simulationResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
