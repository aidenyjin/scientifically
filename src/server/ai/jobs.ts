import "server-only";
import { contentPackSchema, formatIssues, type Lesson } from "@/content/schema/course";
import { now } from "@/lib/clock";
import { db } from "@/server/db";
import { savePack, type PackStatus } from "@/server/repo/packs";
import { chooseDraftPackId, makeGeneratedBy, parseGeneratedBy } from "./drafts";
import { GenerationError, errorMessage } from "./errors";
import { generatePack, outlineFromPack, paramsFromPack, regenerateLesson, type LogLevel } from "./generate";
import { getProvider, type AiProvider } from "./provider";
import {
  courseOutlineSchema,
  generationParamsSchema,
  type CourseOutline,
  type GenerationParams,
  type GenerationParamsInput,
  type NeedsReview,
  type Usage,
} from "./schemas";

/**
 * Generation jobs: a GenerationJob row tracks one run of the pipeline
 * (status queued → outlining → generating → done | failed, a log, the
 * outline, token counts and the resulting packId). Jobs run in-process:
 * call `startGenerationJob` from a server action (or `createGenerationJob` +
 * `after(() => runGenerationJob(id))`), then poll `getJob(id)`.
 */

export const JOB_STATUSES = ["queued", "outlining", "generating", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobLogEntry {
  at: string;
  level: LogLevel;
  message: string;
  /** Set on "lesson finished" entries so the UI can show a progress bar. */
  progress?: { done: number; total: number };
}

export interface GenerationJobView {
  id: string;
  status: JobStatus;
  params: GenerationParams | null;
  log: JobLogEntry[];
  outline: CourseOutline | null;
  packId: string | null;
  inputTokens: number;
  outputTokens: number;
  error: string | null;
  /** Latest lesson progress, if the lesson stage has started. */
  progress: { done: number; total: number } | null;
  /** Still "running" but untouched for 15 min — the server probably restarted mid-job. */
  stale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const STALE_AFTER_MS = 15 * 60_000;
const running = new Map<string, AbortController>();

function parseJson<T>(text: string | null, parse: (v: unknown) => T | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return parse(JSON.parse(text)) ?? fallback;
  } catch {
    return fallback;
  }
}

const isLogEntry = (v: unknown): v is JobLogEntry =>
  typeof v === "object" && v !== null && typeof (v as JobLogEntry).message === "string";

type JobRow = NonNullable<Awaited<ReturnType<typeof db.generationJob.findUnique>>>;

function toView(row: JobRow): GenerationJobView {
  const log = parseJson(row.log, (v) => (Array.isArray(v) ? v.filter(isLogEntry) : null), [] as JobLogEntry[]);
  const status = (JOB_STATUSES as readonly string[]).includes(row.status) ? (row.status as JobStatus) : "failed";
  const progress = [...log].reverse().find((e) => e.progress)?.progress ?? null;
  return {
    id: row.id,
    status,
    params: parseJson(row.params, (v) => generationParamsSchema.safeParse(v).data ?? null, null),
    log,
    outline: parseJson(row.outline, (v) => courseOutlineSchema.safeParse(v).data ?? null, null),
    packId: row.packId,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    error: row.error,
    progress,
    stale:
      (status === "queued" || status === "outlining" || status === "generating") &&
      now().getTime() - row.updatedAt.getTime() > STALE_AFTER_MS &&
      !running.has(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Validate params and create a queued job. Throws GenerationError with readable issues. */
export async function createGenerationJob(input: GenerationParamsInput): Promise<string> {
  const parsed = generationParamsSchema.safeParse(input);
  if (!parsed.success) throw new GenerationError("Invalid generation parameters.", formatIssues(parsed.error));
  const row = await db.generationJob.create({
    data: { params: JSON.stringify(parsed.data), status: "queued", log: "[]" },
    select: { id: true },
  });
  return row.id;
}

export async function getJob(id: string): Promise<GenerationJobView | null> {
  const row = await db.generationJob.findUnique({ where: { id } });
  return row ? toView(row) : null;
}

export async function listJobs(limit = 20): Promise<GenerationJobView[]> {
  const rows = await db.generationJob.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toView);
}

/** Cancel a job running in this process. Returns false if it isn't running here. */
export function cancelGenerationJob(id: string): boolean {
  const controller = running.get(id);
  if (!controller) return false;
  controller.abort();
  return true;
}

/** Coalescing, serialised writer for the job row (lessons log concurrently). */
class JobRecorder {
  private state: {
    status: JobStatus;
    log: JobLogEntry[];
    outline?: string;
    packId?: string;
    inputTokens: number;
    outputTokens: number;
    error?: string | null;
  } = { status: "queued", log: [], inputTokens: 0, outputTokens: 0 };
  private chain: Promise<void> = Promise.resolve();
  private pending = false;

  constructor(private readonly id: string) {}

  log(level: LogLevel, message: string, progress?: JobLogEntry["progress"]) {
    this.state.log.push({ at: now().toISOString(), level, message, ...(progress ? { progress } : {}) });
    this.touch();
  }

  set(patch: Partial<JobRecorder["state"]>) {
    Object.assign(this.state, patch);
    this.touch();
  }

  usage(u: Usage) {
    this.set({ inputTokens: u.inputTokens, outputTokens: u.outputTokens });
  }

  private touch() {
    if (this.pending) return;
    this.pending = true;
    this.chain = this.chain.then(async () => {
      this.pending = false;
      const s = this.state;
      try {
        await db.generationJob.update({
          where: { id: this.id },
          data: {
            status: s.status,
            log: JSON.stringify(s.log),
            inputTokens: s.inputTokens,
            outputTokens: s.outputTokens,
            ...(s.outline !== undefined ? { outline: s.outline } : {}),
            ...(s.packId !== undefined ? { packId: s.packId } : {}),
            ...(s.error !== undefined ? { error: s.error } : {}),
          },
        });
      } catch (error) {
        console.error(`[ai] could not update generation job ${this.id}:`, error);
      }
    });
  }

  async flush() {
    this.touch();
    await this.chain;
  }
}

async function packStatus(id: string): Promise<string | null> {
  const row = await db.contentPack.findUnique({ where: { id }, select: { status: true } });
  return row?.status ?? null;
}

/**
 * Run a queued job to completion, updating its row as it goes, and save the
 * pack as a draft. Never rejects once the job exists (failures are recorded
 * on the row), so it is safe to fire and forget.
 */
export async function runGenerationJob(
  jobId: string,
  options: { provider?: AiProvider; signal?: AbortSignal } = {},
): Promise<{ status: "done" | "failed"; packId?: string; error?: string }> {
  const row = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!row) throw new Error(`Generation job "${jobId}" not found`);
  if (row.status !== "queued") throw new Error(`Generation job "${jobId}" is already ${row.status}`);

  const recorder = new JobRecorder(jobId);
  const controller = new AbortController();
  options.signal?.addEventListener("abort", () => controller.abort(options.signal?.reason), { once: true });
  running.set(jobId, controller);

  try {
    const params = generationParamsSchema.parse(JSON.parse(row.params));
    recorder.set({ status: "outlining" });
    const provider = options.provider ?? (await getProvider());
    recorder.log("info", `Job started with ${provider.name}/${provider.model}`);

    const result = await generatePack(params, {
      provider,
      signal: controller.signal,
      onLog: (level, message) => recorder.log(level, message),
      onUsage: (total) => recorder.usage(total),
      onOutline: async (outline) => {
        recorder.set({ outline: JSON.stringify(outline), status: "generating" });
        await recorder.flush();
      },
      onLessonDone: ({ lessonId, ok, done, total }) =>
        recorder.log(ok ? "info" : "warn", `Progress: ${done}/${total} lessons (${lessonId} ${ok ? "ok" : "failed"})`, {
          done,
          total,
        }),
    });

    const packId = await chooseDraftPackId(result.pack.id, packStatus);
    if (packId !== result.pack.id) {
      recorder.log("warn", `A published/archived pack already uses "${result.pack.id}"; saving the draft as "${packId}"`);
    }
    await savePack(
      { ...result.pack, id: packId },
      "draft",
      makeGeneratedBy({
        provider: result.provider,
        model: result.model,
        jobId,
        params,
        outline: result.outline,
        needsReview: result.needsReview,
        failedLessons: result.failedLessons,
        generatedAt: now(),
      }),
    );
    recorder.usage(result.usage);
    recorder.log(
      result.needsReview.length || result.failedLessons.length ? "warn" : "info",
      `Saved draft pack "${packId}" (${result.needsReview.length} review item(s), ${result.failedLessons.length} failed lesson(s))`,
    );
    recorder.set({ status: "done", packId, error: null });
    return { status: "done", packId };
  } catch (error) {
    const message = errorMessage(error);
    recorder.log("error", message.split("\n")[0]);
    recorder.set({ status: "failed", error: message });
    return { status: "failed", error: message };
  } finally {
    running.delete(jobId);
    await recorder.flush();
  }
}

/** Create a job and run it in the background (fire-and-forget). Returns the job id. */
export async function startGenerationJob(input: GenerationParamsInput): Promise<string> {
  const id = await createGenerationJob(input);
  void runGenerationJob(id).catch((error) => console.error(`[ai] generation job ${id} crashed:`, error));
  return id;
}

/**
 * Admin "regenerate lesson": rewrite one lesson of a stored pack, keep the
 * pack's status, and update its needsReview / failedLessons bookkeeping.
 * Uses the stored generation params and outline when the pack was AI-made,
 * else best-effort params derived from the pack.
 */
export async function regeneratePackLesson(
  packId: string,
  lessonId: string,
  options: { notes?: string; provider?: AiProvider; signal?: AbortSignal; onLog?(level: LogLevel, message: string): void } = {},
): Promise<{ lesson: Lesson; needsReview: NeedsReview[]; usage: Usage }> {
  const row = await db.contentPack.findUnique({ where: { id: packId } });
  if (!row) throw new GenerationError(`Pack "${packId}" not found.`);
  const parsed = contentPackSchema.safeParse(JSON.parse(row.json));
  if (!parsed.success) throw new GenerationError(`Pack "${packId}" is invalid.`, formatIssues(parsed.error));
  const pack = parsed.data;
  const info = parseGeneratedBy(row.generatedBy);
  const params = info?.params ?? paramsFromPack(pack);
  const provider = options.provider ?? (await getProvider());

  const result = await regenerateLesson(pack, lessonId, params, provider, {
    outline: info?.outline ?? outlineFromPack(pack),
    notes: options.notes,
    signal: options.signal,
    onLog: options.onLog,
  });

  let original: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(row.generatedBy);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) original = value as Record<string, unknown>;
  } catch {
    // keep {}
  }
  const generatedBy = {
    ...original,
    ...makeGeneratedBy({
      provider: info?.provider ?? provider.name,
      model: info?.model ?? provider.model,
      jobId: info?.jobId,
      params,
      outline: info?.outline,
      needsReview: [...(info?.needsReview ?? []).filter((n) => n.lessonId !== lessonId), ...result.needsReview],
      failedLessons: (info?.failedLessons ?? []).filter((f) => f.lessonId !== lessonId),
      generatedAt: info?.generatedAt ? new Date(info.generatedAt) : now(),
    }),
    source: info?.source ?? "ai",
    lastRegenerated: { lessonId, provider: provider.name, model: provider.model, at: now().toISOString() },
  };
  await savePack(result.pack, row.status as PackStatus, generatedBy);
  return { lesson: result.lesson, needsReview: result.needsReview, usage: result.usage };
}
