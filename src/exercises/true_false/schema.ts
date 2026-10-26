import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const trueFalseSchema = exerciseBaseSchema.extend({
  type: z.literal("true_false"),
  statement: richText("A single claim the learner judges as true or false"),
  answer: z.boolean(),
});

export type TrueFalse = z.infer<typeof trueFalseSchema>;

export const trueFalseResponseSchema = z.object({ value: z.boolean() });
export type TrueFalseResponse = z.infer<typeof trueFalseResponseSchema>;
