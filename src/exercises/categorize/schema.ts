import { z } from "zod";
import { exerciseBaseSchema, richText, slugSchema } from "@/content/schema/exercise-base";

export const categorizeSchema = exerciseBaseSchema
  .extend({
    type: z.literal("categorize"),
    categories: z.array(z.object({ id: slugSchema, label: z.string().min(1).max(40) })).min(2).max(4),
    items: z
      .array(z.object({ text: richText(), categoryId: slugSchema }))
      .min(4)
      .max(10),
  })
  .refine((ex) => new Set(ex.categories.map((c) => c.id)).size === ex.categories.length, {
    message: "category ids must be unique",
    path: ["categories"],
  })
  .refine((ex) => ex.items.every((it) => ex.categories.some((c) => c.id === it.categoryId)), {
    message: "every item.categoryId must match a category id",
    path: ["items"],
  })
  .refine((ex) => ex.categories.every((c) => ex.items.some((it) => it.categoryId === c.id)), {
    message: "every category needs at least one item",
    path: ["categories"],
  });

export type Categorize = z.infer<typeof categorizeSchema>;

export const categorizeResponseSchema = z.object({
  /** categoryId chosen for each item, aligned with the original `items` order. */
  assignments: z.array(z.string()),
});
export type CategorizeResponse = z.infer<typeof categorizeResponseSchema>;
