import type { ExerciseCore } from "@/content/types";
import { autoCheckFillBlank, gradeFillBlank } from "./grade";
import { fillBlankResponseSchema, fillBlankSchema, type FillBlank, type FillBlankResponse } from "./schema";

export const fillBlank: ExerciseCore<FillBlank, FillBlankResponse> = {
  type: "fill_blank",
  label: "Fill in the blank",
  schema: fillBlankSchema,
  responseSchema: fillBlankResponseSchema,
  grade: gradeFillBlank,
  autoCheck: autoCheckFillBlank,
  promptNotes:
    "Blank out one key term per ___ (1–3 blanks) so the sentence still gives enough context to recall it; answers should be short (1–3 words). List every acceptable form in `accepted` — singular/plural, British/US spelling, symbol vs name — with the preferred form first, and set caseSensitive only for symbols like 'Na' or 'Co'. One-letter typos are forgiven for answers of 5+ letters, so avoid blanks where a near-miss spelling is a different correct term.",
  examples: [
    {
      id: "fb-photosynthesis-gases",
      type: "fill_blank",
      prompt: "Complete the sentence.",
      text: "During photosynthesis, plants take in ___ from the air and release ___.",
      blanks: [
        { accepted: ["carbon dioxide", "CO_{2}"] },
        { accepted: ["oxygen", "O_{2}", "oxygen gas"] },
      ],
      explanation:
        "6CO_{2} + 6H_{2}O → C_{6}H_{12}O_{6} + 6O_{2}. Plants use light energy to turn carbon dioxide and water into glucose, giving off oxygen.",
      hint: "The gas you breathe out goes *in*; the gas you breathe in comes *out*.",
      skillTags: ["plants.photosynthesis"],
      difficulty: 1,
      characterId: "pip",
    },
    {
      id: "fb-element-symbols",
      type: "fill_blank",
      prompt: "Write the chemical symbols.",
      text: "The symbol for sodium is ___ and the symbol for potassium is ___.",
      blanks: [
        { accepted: ["Na"], caseSensitive: true },
        { accepted: ["K"], caseSensitive: true },
      ],
      explanation:
        "Both come from Latin: **Na** from *natrium* and **K** from *kalium*. Capitals matter — Co is cobalt, but CO is carbon monoxide.",
      skillTags: ["atoms.element-symbols"],
      difficulty: 3,
      characterId: "bond",
    },
    {
      id: "fb-newtons-second-law",
      type: "fill_blank",
      prompt: "Fill in the missing word.",
      text: "Newton's second law says the resultant force on an object equals its mass multiplied by its ___.",
      blanks: [{ accepted: ["acceleration"] }],
      explanation:
        "F = m × a. For example, a 2 kg trolley accelerating at 3 m/s^{2} needs a resultant force of 6 N.",
      skillTags: ["forces.newtons-laws"],
      difficulty: 2,
    },
  ],
};
