import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const spotErrorSchema = exerciseBaseSchema
  .extend({
    type: z.literal("spot_error"),
    segments: z
      .array(richText())
      .min(3)
      .max(8)
      .describe("A passage split into clickable chunks (phrases or sentences). Exactly one is wrong."),
    errorIndex: z.number().int().min(0),
    correction: richText("What the wrong segment should say"),
  })
  .refine((ex) => ex.errorIndex < ex.segments.length, {
    message: "errorIndex must point at a segment",
    path: ["errorIndex"],
  });

export type SpotError = z.infer<typeof spotErrorSchema>;

export const spotErrorResponseSchema = z.object({ index: z.number().int().min(0) });
export type SpotErrorResponse = z.infer<typeof spotErrorResponseSchema>;
