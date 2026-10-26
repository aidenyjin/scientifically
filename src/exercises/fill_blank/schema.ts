import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";
import { countBlanks } from "../_shared/blanks";

export const fillBlankSchema = exerciseBaseSchema
  .extend({
    type: z.literal("fill_blank"),
    text: richText("Sentence with ___ (three underscores) for each blank the learner types into"),
    blanks: z
      .array(
        z.object({
          accepted: z
            .array(z.string().min(1))
            .min(1)
            .describe("All acceptable answers. Include common spellings/synonyms."),
          caseSensitive: z.boolean().optional().describe("Default false. Use for symbols like 'Na'."),
        }),
      )
      .min(1)
      .max(3),
  })
  .refine((ex) => countBlanks(ex.text) === ex.blanks.length, {
    message: "number of ___ in text must equal blanks.length",
    path: ["blanks"],
  });

export type FillBlank = z.infer<typeof fillBlankSchema>;

export const fillBlankResponseSchema = z.object({ values: z.array(z.string()) });
export type FillBlankResponse = z.infer<typeof fillBlankResponseSchema>;
