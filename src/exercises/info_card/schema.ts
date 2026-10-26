import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

/** A teaching card: not graded, costs no hearts. Introduces an idea before it is tested. */
export const infoCardSchema = exerciseBaseSchema.extend({
  type: z.literal("info_card"),
  title: z.string().min(1).max(80),
  body: z
    .array(richText())
    .min(1)
    .max(4)
    .describe("1–4 short paragraphs. Each under ~40 words."),
  keyFact: richText("Optional single takeaway shown in a highlighted box").optional(),
});

export type InfoCard = z.infer<typeof infoCardSchema>;

export const infoCardResponseSchema = z.object({});
export type InfoCardResponse = z.infer<typeof infoCardResponseSchema>;
