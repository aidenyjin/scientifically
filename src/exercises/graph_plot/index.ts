import type { ExerciseCore } from "@/content/types";
import { autoCheckGraphPlot, gradeGraphPlot } from "./grade";
import { graphPlotResponseSchema, graphPlotSchema, type GraphPlot, type GraphPlotResponse } from "./schema";

export const graphPlot: ExerciseCore<GraphPlot, GraphPlotResponse> = {
  type: "graph_plot",
  label: "Plot the graph",
  schema: graphPlotSchema,
  responseSchema: graphPlotResponseSchema,
  grade: gradeGraphPlot,
  autoCheck: autoCheckGraphPlot,
  promptNotes:
    "Give everything needed to work out each point in the prompt (a short calculation, a rule like a half-life, or a small table), 3–6 points, and say how many points to plot. Every point must sit on a grid intersection (min + whole multiples of xStep/yStep), with 2–24 steps per axis; tolerance must be smaller than both steps (0 is fine). Set connect for relationships worth seeing as a line.",
  examples: [
    {
      id: "gp-ohms-law",
      type: "graph_plot",
      prompt:
        "Plot the current through a **5 Ω** resistor when the voltage across it is 2, 4, 6, 8 and 10 V.",
      axes: {
        xLabel: "Voltage (V)",
        yLabel: "Current (A)",
        xMin: 0,
        xMax: 10,
        yMin: 0,
        yMax: 2,
        xStep: 1,
        yStep: 0.2,
      },
      points: [
        [2, 0.4],
        [4, 0.8],
        [6, 1.2],
        [8, 1.6],
        [10, 2],
      ],
      tolerance: 0,
      connect: true,
      explanation:
        "Ohm's law: I = V ÷ R. At 2 V, 2 ÷ 5 = **0.4 A**, and every extra 2 V adds another 0.4 A. The points make a straight line through the origin: current is **proportional** to voltage for a fixed resistor.",
      hint: "Use I = V ÷ R. For 2 V: 2 ÷ 5 = 0.4 A.",
      skillTags: ["electricity.ohms-law"],
      difficulty: 2,
      characterId: "volt",
    },
    {
      id: "gp-half-life",
      type: "graph_plot",
      prompt:
        "A rock sample holds **80 g** of an isotope with a half-life of **2 days**. Plot the mass left at 0, 2, 4, 6 and 8 days.",
      axes: {
        xLabel: "Time (days)",
        yLabel: "Mass left (g)",
        xMin: 0,
        xMax: 10,
        yMin: 0,
        yMax: 80,
        xStep: 1,
        yStep: 5,
      },
      points: [
        [0, 80],
        [2, 40],
        [4, 20],
        [6, 10],
        [8, 5],
      ],
      tolerance: 0,
      connect: true,
      explanation:
        "Each half-life halves what is left: 80 → 40 → 20 → 10 → 5 g. The curve drops steeply at first and then flattens, because half of a smaller amount is a smaller drop. That shape is **exponential decay**.",
      skillTags: ["radioactivity.half-life"],
      difficulty: 3,
      characterId: "terra",
    },
    {
      id: "gp-spring-extension",
      type: "graph_plot",
      prompt:
        "A spring has a spring constant of **25 N/m**. Plot its extension, in cm, for loads of 1, 2, 3 and 4 N.",
      axes: {
        xLabel: "Force (N)",
        yLabel: "Extension (cm)",
        xMin: 0,
        xMax: 5,
        yMin: 0,
        yMax: 20,
        xStep: 0.5,
        yStep: 2,
      },
      points: [
        [1, 4],
        [2, 8],
        [3, 12],
        [4, 16],
      ],
      tolerance: 0,
      explanation:
        "Hooke's law: extension = F ÷ k. For 1 N: 1 ÷ 25 = 0.04 m = **4 cm**. Each extra newton stretches it another 4 cm, so the points lie on a straight line through the origin.",
      hint: "Work in metres first, then convert: 1 m = 100 cm.",
      skillTags: ["forces.hookes-law"],
      difficulty: 3,
    },
  ],
};
