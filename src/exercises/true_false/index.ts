import type { ExerciseCore } from "@/content/types";
import { gradeTrueFalse } from "./grade";
import {
  trueFalseResponseSchema,
  trueFalseSchema,
  type TrueFalse,
  type TrueFalseResponse,
} from "./schema";

export const trueFalse: ExerciseCore<TrueFalse, TrueFalseResponse> = {
  type: "true_false",
  label: "True or false",
  schema: trueFalseSchema,
  responseSchema: trueFalseResponseSchema,
  grade: gradeTrueFalse,
  promptNotes:
    "The statement must be unambiguously true or false with no 'it depends'. False statements should target a common misconception. The prompt is usually just 'True or false?'.",
  examples: [
    {
      id: "tf-heavier-falls-faster",
      type: "true_false",
      prompt: "True or false?",
      statement: "In a vacuum, a hammer falls faster than a feather.",
      answer: false,
      explanation:
        "Without air resistance, every object accelerates at the same rate (about 9.8 m/s^{2} on Earth). Apollo 15 astronauts showed this on the Moon.",
      skillTags: ["motion.gravity"],
      difficulty: 2,
      characterId: "nova",
    },
    {
      id: "tf-plants-respire",
      type: "true_false",
      prompt: "True or false?",
      statement: "Plant cells carry out respiration as well as photosynthesis.",
      answer: true,
      explanation:
        "Plants photosynthesise to make glucose, and **all** living cells respire to release energy from it — including plant cells, day and night.",
      skillTags: ["cells.respiration"],
      difficulty: 2,
      characterId: "pip",
    },
  ],
};
