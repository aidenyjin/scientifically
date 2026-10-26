import type { ExerciseCore } from "@/content/types";
import { autoCheckNumeric, gradeNumeric } from "./grade";
import { numericResponseSchema, numericSchema, type Numeric, type NumericResponse } from "./schema";

export const numeric: ExerciseCore<Numeric, NumericResponse> = {
  type: "numeric",
  label: "Numeric answer",
  schema: numericSchema,
  responseSchema: numericResponseSchema,
  grade: gradeNumeric,
  autoCheck: autoCheckNumeric,
  promptNotes:
    "Ask for one number and give every value the learner needs in the prompt, with units. Set `unit` and a tolerance that accepts sensible rounding (rel 0.01–0.02, or an abs that matches the precision you ask for), and always include `computation` with one var per given value so the answer can be verified. Add `unitChoices` (2–3 plausible wrong units) only when working out the unit is part of the skill.",
  examples: [
    {
      id: "num-sunlight-travel-time",
      type: "numeric",
      prompt:
        "Sunlight travels 1.5×10^{11} m to reach Earth at 3.0×10^{8} m/s. How many **seconds** does the trip take?",
      answer: 500,
      tolerance: { rel: 0.01 },
      unit: "s",
      computation: { expr: "d / c", vars: { d: 1.5e11, c: 3.0e8 } },
      explanation:
        "Time = distance ÷ speed = 1.5×10^{11} m ÷ 3.0×10^{8} m/s = **500 s**, a little over 8 minutes. The sunlight you see left the Sun about 8 minutes ago.",
      hint: "time = distance ÷ speed. You can type powers of ten like 1.5e11.",
      skillTags: ["waves.speed-of-light"],
      difficulty: 3,
      characterId: "nova",
    },
    {
      id: "num-aluminium-density",
      type: "numeric",
      prompt:
        "A 54 g block of aluminium has a volume of 20 cm^{3}. What is its density? Pick the unit too.",
      answer: 2.7,
      tolerance: { abs: 0.05 },
      unit: "g/cm^{3}",
      unitChoices: ["cm^{3}/g", "g·cm^{3}", "g/cm^{2}"],
      computation: { expr: "m / V", vars: { m: 54, V: 20 } },
      explanation:
        "Density = mass ÷ volume = 54 g ÷ 20 cm^{3} = **2.7 g/cm^{3}**. Dividing grams by cubic centimetres gives g/cm^{3} — the unit records how the number was made.",
      hint: "density = mass ÷ volume",
      skillTags: ["matter.density"],
      difficulty: 2,
      characterId: "bond",
    },
    {
      id: "num-pendulum-period",
      type: "numeric",
      prompt:
        "A pendulum is 1.0 m long. Using T = 2π√(L/g) with g = 9.8 m/s^{2}, what is its period to 2 decimal places?",
      answer: 2.01,
      tolerance: { abs: 0.015 },
      unit: "s",
      computation: { expr: "2 * pi * sqrt(L / g)", vars: { L: 1.0, g: 9.8 } },
      explanation:
        "T = 2π × √(1.0 ÷ 9.8) = 2π × 0.319 ≈ **2.01 s**. The mass of the bob doesn't appear in the formula — only the length and gravity set the period.",
      skillTags: ["forces.pendulum"],
      difficulty: 3,
    },
  ],
};
