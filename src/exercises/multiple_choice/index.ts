import type { ExerciseCore } from "@/content/types";
import { autoCheckMultipleChoice, gradeMultipleChoice } from "./grade";
import {
  multipleChoiceResponseSchema,
  multipleChoiceSchema,
  type MultipleChoice,
  type MultipleChoiceResponse,
} from "./schema";

/**
 * REFERENCE IMPLEMENTATION. Every exercise type folder has the same shape:
 *   schema.ts      Zod schema for the exercise JSON + the response
 *   grade.ts       pure grading (+ optional autoCheck) — unit tested
 *   index.ts       the server-safe ExerciseCore (this file)
 *   Component.tsx  the client UI
 *   grade.test.ts  tests
 */
export const multipleChoice: ExerciseCore<MultipleChoice, MultipleChoiceResponse> = {
  type: "multiple_choice",
  label: "Multiple choice",
  schema: multipleChoiceSchema,
  responseSchema: multipleChoiceResponseSchema,
  grade: gradeMultipleChoice,
  autoCheck: autoCheckMultipleChoice,
  promptNotes:
    "Exactly one option is correct. Distractors should be plausible misconceptions, not jokes. Keep options similar in length so the answer isn't obvious from formatting. 3–4 options is ideal.",
  examples: [
    {
      id: "mc-mitochondria",
      type: "multiple_choice",
      prompt: "Which organelle releases energy from glucose through aerobic respiration?",
      options: ["Mitochondrion", "Ribosome", "Chloroplast", "Nucleus"],
      answerIndex: 0,
      explanation:
        "**Mitochondria** carry out aerobic respiration. Chloroplasts *store* energy in glucose by photosynthesis; ribosomes make proteins.",
      skillTags: ["cells.organelles"],
      difficulty: 1,
      characterId: "pip",
    },
    {
      id: "mc-acceleration-units",
      type: "multiple_choice",
      prompt: "What is the SI unit of acceleration?",
      options: ["m/s", "m/s^{2}", "N/m", "kg·m/s"],
      answerIndex: 1,
      explanation:
        "Acceleration is the change in velocity (m/s) per second, so its unit is m/s^{2}. kg·m/s is momentum.",
      skillTags: ["motion.units"],
      difficulty: 2,
    },
    {
      id: "mc-noble-gas",
      type: "multiple_choice",
      prompt: "Why is neon so unreactive?",
      options: [
        "Its outer electron shell is full",
        "It has no protons",
        "It is a liquid at room temperature",
        "Its atoms are too large to bond",
      ],
      answerIndex: 0,
      explanation:
        "Noble gases have a **full outer shell**, so they have no tendency to gain, lose or share electrons.",
      skillTags: ["atoms.electron-shells"],
      difficulty: 2,
      characterId: "bond",
    },
  ],
};
