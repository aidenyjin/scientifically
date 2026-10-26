import type { ExerciseCore } from "@/content/types";
import { infoCardResponseSchema, infoCardSchema, type InfoCard, type InfoCardResponse } from "./schema";

export const infoCard: ExerciseCore<InfoCard, InfoCardResponse> = {
  type: "info_card",
  label: "Info card",
  graded: false,
  schema: infoCardSchema,
  responseSchema: infoCardResponseSchema,
  grade: (ex) => ({ correct: true, correctAnswerText: ex.title }),
  promptNotes:
    "Use at the start of a lesson (and at most once more mid-lesson) to introduce a new idea that the next exercises test. Be concrete and vivid; one idea per card. `prompt` is a short label like 'New idea'. `explanation` can repeat the key fact.",
  examples: [
    {
      id: "info-density",
      type: "info_card",
      prompt: "New idea",
      title: "Density",
      body: [
        "**Density** is how much mass is packed into a given volume: ρ = m / V.",
        "A brick and a sponge can be the same size, but the brick has far more mass in that space — so it is denser.",
      ],
      keyFact: "Objects denser than water (1 g/cm^{3}) sink; less dense objects float.",
      explanation: "Density = mass ÷ volume.",
      skillTags: ["matter.density"],
      difficulty: 1,
      characterId: "lumi",
    },
  ],
};
