import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";
import { countBlanks } from "../_shared/blanks";

export const wordBankSchema = exerciseBaseSchema
  .extend({
    type: z.literal("word_bank"),
    text: richText("Sentence with ___ for each blank, filled by tapping word tiles"),
    answers: z.array(z.string().min(1)).min(1).max(5).describe("Correct tile for each blank, in order"),
    distractors: z.array(z.string().min(1)).min(1).max(6).describe("Wrong tiles mixed into the bank"),
  })
  .refine((ex) => countBlanks(ex.text) === ex.answers.length, {
    message: "number of ___ in text must equal answers.length",
    path: ["answers"],
  })
  .refine((ex) => ex.answers.length + ex.distractors.length <= 9, {
    message: "at most 9 tiles in total (answers + distractors), so each has a 1–9 key",
    path: ["distractors"],
  });

export type WordBank = z.infer<typeof wordBankSchema>;

export const wordBankResponseSchema = z.object({
  /** Tile text placed in each blank, in blank order. */
  tiles: z.array(z.string()),
});
export type WordBankResponse = z.infer<typeof wordBankResponseSchema>;
