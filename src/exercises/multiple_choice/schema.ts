import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const multipleChoiceSchema = exerciseBaseSchema
  .extend({
    type: z.literal("multiple_choice"),
    options: z.array(richText()).min(2).max(5).describe("Answer options. Shuffled when shown."),
    answerIndex: z.number().int().min(0).describe("Index into options of the single correct answer"),
  })
  .refine((ex) => ex.answerIndex < ex.options.length, {
    message: "answerIndex must point at an option",
    path: ["answerIndex"],
  });

export type MultipleChoice = z.infer<typeof multipleChoiceSchema>;

export const multipleChoiceResponseSchema = z.object({
  /** Index into the original (unshuffled) options. */
  index: z.number().int().min(0),
});

export type MultipleChoiceResponse = z.infer<typeof multipleChoiceResponseSchema>;
