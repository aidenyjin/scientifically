import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const multiSelectSchema = exerciseBaseSchema
  .extend({
    type: z.literal("multi_select"),
    options: z.array(richText()).min(3).max(6),
    answerIndices: z
      .array(z.number().int().min(0))
      .min(1)
      .describe("Indices of ALL correct options. At least one option must be wrong."),
  })
  .refine((ex) => ex.answerIndices.every((i) => i < ex.options.length), {
    message: "answerIndices must point at options",
    path: ["answerIndices"],
  })
  .refine((ex) => new Set(ex.answerIndices).size === ex.answerIndices.length, {
    message: "answerIndices must be unique",
    path: ["answerIndices"],
  })
  .refine((ex) => ex.answerIndices.length < ex.options.length, {
    message: "at least one option must be incorrect",
    path: ["answerIndices"],
  });

export type MultiSelect = z.infer<typeof multiSelectSchema>;

export const multiSelectResponseSchema = z.object({
  /** Original (unshuffled) option indices the learner ticked. */
  indices: z.array(z.number().int().min(0)),
});
export type MultiSelectResponse = z.infer<typeof multiSelectResponseSchema>;
