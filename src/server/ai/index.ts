import "server-only";

/**
 * Server-only entry point for app code (server actions, route handlers,
 * server components). Import from "@/server/ai", never from the individual
 * adapter files. The CLI imports the core modules directly because
 * "server-only" throws outside React Server environments.
 */
export { getProvider, DEFAULT_MODELS, type AiProvider, type AiRequest, type AiResult } from "./provider";
export {
  generatePack,
  regenerateLesson,
  outlineFromPack,
  paramsFromPack,
  resolveTypes,
  isTypeReady,
  type GenerateOptions,
  type GenerateResult,
  type RegenerateOptions,
  type RegenerateResult,
  type LogLevel,
} from "./generate";
export {
  generationParamsSchema,
  courseOutlineSchema,
  needsReviewSchema,
  failedLessonSchema,
  exerciseTypeSchema,
  type GenerationParams,
  type GenerationParamsInput,
  type CourseOutline,
  type NeedsReview,
  type FailedLesson,
  type Usage,
} from "./schemas";
export { checkPack, checkPackJson, checkLessonOutput, type PackCheck } from "./validate";
export { parseGeneratedBy, generatedBySchema, type GeneratedBy } from "./drafts";
export {
  AiError,
  AiConfigError,
  AiProviderError,
  AiOutputError,
  AiAbortError,
  BudgetExceededError,
  GenerationError,
  LessonGenerationError,
} from "./errors";
export {
  createGenerationJob,
  runGenerationJob,
  startGenerationJob,
  getJob,
  listJobs,
  cancelGenerationJob,
  regeneratePackLesson,
  JOB_STATUSES,
  type JobStatus,
  type JobLogEntry,
  type GenerationJobView,
} from "./jobs";
