import { z } from "zod";
import {
  courseOutlineSchema,
  failedLessonSchema,
  generationParamsSchema,
  needsReviewSchema,
  type CourseOutline,
  type FailedLesson,
  type GenerationParams,
  type NeedsReview,
} from "./schemas";

/**
 * What we store in ContentPack.generatedBy for AI-generated packs. The admin
 * review page reads `needsReview` / `failedLessons` from here (via
 * `parseGeneratedBy`) and passes `params` + `outline` to regenerateLesson.
 */
export const generatedBySchema = z.object({
  source: z.enum(["ai", "cli"]).default("ai"),
  provider: z.string(),
  model: z.string(),
  jobId: z.string().optional(),
  params: generationParamsSchema,
  outline: courseOutlineSchema.optional(),
  needsReview: z.array(needsReviewSchema).default([]),
  failedLessons: z.array(failedLessonSchema).default([]),
  generatedAt: z.string().optional(),
});

export type GeneratedBy = z.infer<typeof generatedBySchema>;

export function makeGeneratedBy(input: {
  source?: "ai" | "cli";
  provider: string;
  model: string;
  jobId?: string;
  params: GenerationParams;
  outline?: CourseOutline;
  needsReview: NeedsReview[];
  failedLessons: FailedLesson[];
  generatedAt: Date;
}): GeneratedBy {
  return {
    source: input.source ?? "ai",
    provider: input.provider,
    model: input.model,
    ...(input.jobId ? { jobId: input.jobId } : {}),
    params: input.params,
    ...(input.outline ? { outline: input.outline } : {}),
    needsReview: input.needsReview,
    failedLessons: input.failedLessons,
    generatedAt: input.generatedAt.toISOString(),
  };
}

/** Parse ContentPack.generatedBy; null for non-AI packs (demo, imports) or unreadable JSON. */
export function parseGeneratedBy(json: string | null | undefined): GeneratedBy | null {
  if (!json) return null;
  try {
    const parsed = generatedBySchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Pick a pack id that won't overwrite a published/archived pack: drafts with
 * the same id are replaced (re-running a job), anything else gets a suffix.
 */
export async function chooseDraftPackId(
  id: string,
  statusOf: (id: string) => Promise<string | null>,
): Promise<string> {
  let candidate = id;
  for (let n = 2; ; n++) {
    const status = await statusOf(candidate);
    if (status === null || status === "draft") return candidate;
    candidate = `${id}-${n}`;
  }
}
