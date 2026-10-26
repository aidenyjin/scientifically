import type { ExerciseCore } from "@/content/types";
import { autoCheckGraphRead, gradeGraphRead } from "./grade";
import { graphReadResponseSchema, graphReadSchema, type GraphRead, type GraphReadResponse } from "./schema";

export const graphRead: ExerciseCore<GraphRead, GraphReadResponse> = {
  type: "graph_read",
  label: "Read the graph",
  schema: graphReadSchema,
  responseSchema: graphReadResponseSchema,
  grade: gradeGraphRead,
  autoCheck: autoCheckGraphRead,
  promptNotes:
    "Plot realistic data with the quantity and SI unit in each axis label, e.g. 'Time (s)'; values are never shown in a tooltip before checking, so the learner must read gridlines. Use numeric mode only for a value read straight off the chart (a y at a given x, or the x where y reaches a value) with a tolerance of about half a gridline; ask about trends, comparisons, gradients or areas in choice mode. Bar charts use xCategories with x = 0, 1, 2…; use at most 4 series.",
  examples: [
    {
      id: "gr-velocity-time",
      type: "graph_read",
      prompt: "The graph shows a cyclist speeding up, then riding steadily. What is their velocity at **4 s**?",
      chart: {
        kind: "line",
        xLabel: "Time (s)",
        yLabel: "Velocity (m/s)",
        series: [
          {
            name: "Cyclist",
            points: [
              [0, 0],
              [1, 3],
              [2, 6],
              [3, 9],
              [4, 12],
              [5, 15],
              [6, 15],
              [7, 15],
              [8, 15],
            ],
          },
        ],
      },
      question: { mode: "numeric", answer: 12, tolerance: { abs: 0.5 }, unit: "m/s" },
      explanation:
        "Go up from 4 s to the line, then across to the velocity axis: **12 m/s**. The straight sloping part means a constant acceleration of 3 m/s^{2}; the flat part means constant velocity.",
      hint: "Find 4 on the time axis, go straight up to the line, then straight across.",
      skillTags: ["motion.velocity-time-graphs"],
      difficulty: 1,
      characterId: "lumi",
    },
    {
      id: "gr-density-metals",
      type: "graph_read",
      prompt: "Each point is a block of metal. Which metal is **denser**?",
      chart: {
        kind: "scatter",
        title: "Mass against volume",
        xLabel: "Volume (cm^{3})",
        yLabel: "Mass (g)",
        series: [
          {
            name: "Aluminium",
            points: [
              [2, 5.4],
              [4, 10.8],
              [6, 16.2],
              [8, 21.6],
              [10, 27],
            ],
          },
          {
            name: "Iron",
            points: [
              [1, 7.9],
              [2, 15.7],
              [3, 23.6],
              [4, 31.5],
              [5, 39.4],
            ],
          },
        ],
      },
      question: {
        mode: "choice",
        options: [
          "Iron: each cm^{3} has more mass",
          "Aluminium: its points reach further right",
          "Both have the same density",
          "Aluminium: its blocks are bigger",
        ],
        answerIndex: 0,
      },
      explanation:
        "Density = mass ÷ volume: the **gradient** of each set of points. Iron: 39.4 g ÷ 5 cm^{3} ≈ 7.9 g/cm^{3}; aluminium: 27 g ÷ 10 cm^{3} = 2.7 g/cm^{3}. Steeper means denser, whatever the block size.",
      skillTags: ["matter.density"],
      difficulty: 3,
      characterId: "bond",
    },
    {
      id: "gr-planet-gravity",
      type: "graph_read",
      prompt: "About how many times stronger is gravity on Jupiter's surface than on Earth's?",
      chart: {
        kind: "bar",
        title: "Surface gravity",
        xLabel: "Planet",
        yLabel: "Gravity (m/s^{2})",
        xCategories: ["Mercury", "Venus", "Earth", "Mars", "Jupiter"],
        series: [
          {
            name: "Surface gravity",
            points: [
              [0, 3.7],
              [1, 8.9],
              [2, 9.8],
              [3, 3.7],
              [4, 24.8],
            ],
          },
        ],
      },
      question: {
        mode: "choice",
        options: ["About 2.5 times", "About 25 times", "About 10 times", "About the same"],
        answerIndex: 0,
      },
      explanation:
        "Jupiter's bar reaches about 24.8 m/s^{2} and Earth's about 9.8 m/s^{2}. 24.8 ÷ 9.8 ≈ **2.5**, so you would weigh about 2.5 times as much there. 25 is Jupiter's value in m/s^{2}, not the ratio.",
      skillTags: ["forces.gravity", "space.planets"],
      difficulty: 2,
      characterId: "nova",
    },
  ],
};
