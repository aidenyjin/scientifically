import type { ExerciseCore } from "@/content/types";
import { autoCheckMultiSelect, gradeMultiSelect } from "./grade";
import { multiSelectResponseSchema, multiSelectSchema, type MultiSelect, type MultiSelectResponse } from "./schema";

export const multiSelect: ExerciseCore<MultiSelect, MultiSelectResponse> = {
  type: "multi_select",
  label: "Select all that apply",
  schema: multiSelectSchema,
  responseSchema: multiSelectResponseSchema,
  grade: gradeMultiSelect,
  autoCheck: autoCheckMultiSelect,
  promptNotes:
    "Write 4–6 options where usually 2–3 are correct; every option must be clearly true or clearly false on its own, with wrong ones based on real misconceptions. Phrase the prompt as a category question ('Which of these are…?') and never use 'all/none of the above'.",
  examples: [
    {
      id: "ms-respiration-products",
      type: "multi_select",
      prompt: "Which of these are products of aerobic respiration?",
      options: [
        "Carbon dioxide (CO_{2})",
        "Water (H_{2}O)",
        "Oxygen (O_{2})",
        "Glucose (C_{6}H_{12}O_{6})",
        "Lactic acid",
      ],
      answerIndices: [0, 1],
      explanation:
        "C_{6}H_{12}O_{6} + 6O_{2} → 6CO_{2} + 6H_{2}O, releasing energy. Glucose and oxygen are the *reactants*; lactic acid is only made in **anaerobic** respiration in animals.",
      hint: "Think about what goes *in* and what comes *out* of the equation.",
      skillTags: ["cells.respiration"],
      difficulty: 2,
      characterId: "pip",
    },
    {
      id: "ms-vector-quantities",
      type: "multi_select",
      prompt: "Which of these are **vector** quantities?",
      options: ["Velocity", "Speed", "Force", "Mass", "Acceleration", "Temperature"],
      answerIndices: [0, 2, 4],
      explanation:
        "A vector has a size **and** a direction. Velocity, force and acceleration all point somewhere; speed, mass and temperature only have a size, so they are scalars.",
      skillTags: ["motion.vectors-scalars"],
      difficulty: 2,
    },
    {
      id: "ms-igneous-rocks",
      type: "multi_select",
      prompt: "Which of these rocks are igneous?",
      options: ["Granite", "Basalt", "Limestone", "Marble", "Obsidian"],
      answerIndices: [0, 1, 4],
      explanation:
        "Igneous rocks form when magma or lava cools. Granite cools slowly underground, basalt and obsidian cool fast at the surface. Limestone is **sedimentary** and marble is **metamorphic** (heated limestone).",
      skillTags: ["earth.rock-types"],
      difficulty: 3,
      characterId: "terra",
    },
  ],
};
