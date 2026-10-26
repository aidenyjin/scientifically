import type { ExerciseCore } from "@/content/types";
import { graphPlotResponseSchema, graphPlotSchema, type GraphPlot, type GraphPlotResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const graphPlot: ExerciseCore<GraphPlot, GraphPlotResponse> = {
  type: "graph_plot",
  label: "Plot the graph",
  schema: graphPlotSchema,
  responseSchema: graphPlotResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
