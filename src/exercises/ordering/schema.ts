import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";

export const orderingSchema = exerciseBaseSchema.extend({
  type: z.literal("ordering"),
  items: z.array(richText()).min(3).max(7).describe("Items in the CORRECT order. Shuffled when shown."),
  startLabel: z.string().max(24).optional().describe("Label for the top end, e.g. 'First' or 'Smallest'"),
  endLabel: z.string().max(24).optional().describe("Label for the bottom end, e.g. 'Last' or 'Largest'"),
});

export type Ordering = z.infer<typeof orderingSchema>;

export const orderingResponseSchema = z.object({
  /** Original item indices in the order the learner arranged them. */
  order: z.array(z.number().int().min(0)),
});
export type OrderingResponse = z.infer<typeof orderingResponseSchema>;
