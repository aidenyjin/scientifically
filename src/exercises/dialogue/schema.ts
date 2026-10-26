import { z } from "zod";
import { characterIdSchema, exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const dialogueSchema = exerciseBaseSchema
  .extend({
    type: z.literal("dialogue"),
    lines: z
      .array(z.object({ characterId: characterIdSchema, text: richText() }))
      .min(1)
      .max(6)
      .describe("A short scene between characters that sets up the question"),
    question: z.object({
      options: z.array(richText()).min(2).max(4),
      answerIndex: z.number().int().min(0),
    }),
  })
  .refine((ex) => ex.question.answerIndex < ex.question.options.length, {
    message: "answerIndex must point at an option",
    path: ["question", "answerIndex"],
  });

export type Dialogue = z.infer<typeof dialogueSchema>;

export const dialogueResponseSchema = z.object({ index: z.number().int().min(0) });
export type DialogueResponse = z.infer<typeof dialogueResponseSchema>;
