import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const matchPairsSchema = exerciseBaseSchema
  .extend({
    type: z.literal("match_pairs"),
    pairs: z
      .array(z.object({ left: richText(), right: richText() }))
      .min(3)
      .max(6)
      .describe("Term ↔ match pairs. Both columns are shuffled independently."),
  })
  .refine((ex) => new Set(ex.pairs.map((p) => p.left)).size === ex.pairs.length, {
    message: "left items must be unique",
    path: ["pairs"],
  })
  .refine((ex) => new Set(ex.pairs.map((p) => p.right)).size === ex.pairs.length, {
    message: "right items must be unique",
    path: ["pairs"],
  });

export type MatchPairs = z.infer<typeof matchPairsSchema>;

export const matchPairsResponseSchema = z.object({
  /** Number of wrong pairings tried before all pairs were matched. */
  mistakes: z.number().int().min(0),
});
export type MatchPairsResponse = z.infer<typeof matchPairsResponseSchema>;
