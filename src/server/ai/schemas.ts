import { z } from "zod";
import { EXERCISE_TYPES, type ExerciseType } from "@/content/registry";
import { slugSchema } from "@/content/schema/exercise-base";

/** Every registered exercise type, as a Zod enum (read from the registry at load time). */
export const exerciseTypeSchema = z.enum(EXERCISE_TYPES as [ExerciseType, ...ExerciseType[]]);

export const skillTagSchema = z
  .string()
  .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/, "must be a dotted skill id like 'acids.ph-scale'");

/** What the admin form / CLI asks for. */
export const generationParamsSchema = z.object({
  subject: z.string().trim().min(1).max(40).describe("e.g. 'chemistry'"),
  topic: z.string().trim().min(1).max(200).describe("What the course covers, e.g. 'acids and bases'"),
  level: z.string().trim().min(1).max(60).describe("Audience, e.g. 'High school' or 'AP Physics 1'"),
  units: z.number().int().min(1).max(10).default(3),
  lessonsPerUnit: z
    .number()
    .int()
    .min(2)
    .max(8)
    .default(4)
    .describe("Standard lessons per unit; the checkpoint (if any) comes on top"),
  exercisesPerLesson: z.number().int().min(8).max(15).default(10),
  types: z
    .array(exerciseTypeSchema)
    .min(1)
    .optional()
    .describe("Allowed exercise types (default: all ready types). info_card is always allowed."),
  tone: z.string().trim().max(200).optional().describe("e.g. 'playful', 'exam-focused'"),
  notes: z.string().trim().max(2000).optional().describe("Free-form instructions for the AI"),
  packId: slugSchema.optional().describe("Pack id to use; default is derived from the title"),
  includeCheckpoints: z.boolean().default(true),
  maxTotalTokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Abort when input + output tokens across all calls exceed this"),
});

export type GenerationParams = z.infer<typeof generationParamsSchema>;
export type GenerationParamsInput = z.input<typeof generationParamsSchema>;

// ---------------------------------------------------------------------------
// Stage 1: outline
// ---------------------------------------------------------------------------

export const outlineLessonSchema = z.object({
  id: slugSchema.describe("Unique slug across the whole pack, e.g. 'ph-scale-basics'"),
  title: z.string().min(1).max(60),
  kind: z.enum(["standard", "checkpoint"]).describe("checkpoint = end-of-unit review lesson"),
  objectives: z
    .array(z.string().min(1).max(160))
    .min(1)
    .max(4)
    .describe("What the learner can do after the lesson; start with a verb"),
  skillTags: z
    .array(skillTagSchema)
    .min(1)
    .max(8)
    .describe("Dotted skill ids the lesson's exercises will be tagged with"),
  exerciseTypes: z
    .array(exerciseTypeSchema)
    .min(1)
    .max(8)
    .describe("Exercise types that suit this lesson, most important first"),
});

export const outlineUnitSchema = z.object({
  id: slugSchema,
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Optional hex colour for the unit banner"),
  lessons: z.array(outlineLessonSchema).min(1).max(12),
});

export const courseOutlineSchema = z.object({
  title: z.string().min(1).max(80).describe("Course title shown to learners"),
  description: z.string().min(1).max(300),
  units: z.array(outlineUnitSchema).min(1).max(20),
});

export type OutlineLesson = z.infer<typeof outlineLessonSchema>;
export type OutlineUnit = z.infer<typeof outlineUnitSchema>;
export type CourseOutline = z.infer<typeof courseOutlineSchema>;

/** Token counts. `inputTokens` includes cache reads/writes. */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}

export const totalTokens = (u: Usage) => u.inputTokens + u.outputTokens;

/** Something a reviewer should look at: an exercise that was dropped, or a lesson-level problem. */
export const needsReviewSchema = z.object({
  lessonId: z.string(),
  exerciseId: z.string().optional(),
  errors: z.array(z.string()),
});
export type NeedsReview = z.infer<typeof needsReviewSchema>;

/** A lesson that could not be generated and was left out of the pack. */
export const failedLessonSchema = z.object({
  unitId: z.string(),
  lessonId: z.string(),
  title: z.string(),
  errors: z.array(z.string()),
});
export type FailedLesson = z.infer<typeof failedLessonSchema>;
