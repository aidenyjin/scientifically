import type { ExerciseCore } from "@/content/types";
import { dialogueResponseSchema, dialogueSchema, type Dialogue, type DialogueResponse } from "./schema";

// STUB — replace grade, autoCheck, examples and promptNotes. See multiple_choice/ for the pattern.
export const dialogue: ExerciseCore<Dialogue, DialogueResponse> = {
  type: "dialogue",
  label: "Dialogue",
  schema: dialogueSchema,
  responseSchema: dialogueResponseSchema,
  grade: () => ({ correct: false, correctAnswerText: "(not implemented)" }),
  promptNotes: "",
  examples: [],
};
