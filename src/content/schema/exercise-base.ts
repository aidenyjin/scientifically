import { z } from "zod";

/** Character ids the AI may reference. Visuals live in src/characters. */
export const CHARACTER_IDS = ["lumi", "nova", "pip", "bond", "volt", "terra"] as const;
export const characterIdSchema = z.enum(CHARACTER_IDS);
export type CharacterId = z.infer<typeof characterIdSchema>;

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase slug like 'cell-basics-1'");

/** Text that may contain the RichText markup (see src/content/richtext.ts). */
export const richText = (description?: string) =>
  z
    .string()
    .min(1)
    .describe(
      (description ? description + ". " : "") +
        "Markup allowed: **bold**, *italic*, H_{2}O subscripts, m/s^{2} superscripts.",
    );

/** Fields every exercise has. Each type extends this with its own fields. */
export const exerciseBaseSchema = z.object({
  id: slugSchema.describe("Unique within the pack"),
  prompt: richText("Instruction or question shown at the top of the screen"),
  explanation: richText("Shown after answering, right or wrong. Teach *why*."),
  hint: richText("Optional nudge shown when the learner asks for a hint").optional(),
  skillTags: z
    .array(z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/))
    .min(1)
    .describe("Dotted skill ids such as 'cells.organelles'. Used for spaced repetition."),
  difficulty: z.number().int().min(1).max(5),
  characterId: characterIdSchema
    .optional()
    .describe("Character shown beside the prompt"),
});

export type ExerciseBase = z.infer<typeof exerciseBaseSchema>;
