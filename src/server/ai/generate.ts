import { EXERCISE_TYPES, getCore, type ExerciseType } from "@/content/registry";
import {
  SCHEMA_VERSION,
  formatIssues,
  lessonSchema,
  validatePack,
  type ContentPack,
  type Lesson,
  type Unit,
} from "@/content/schema/course";
import { SIM_MODELS } from "@/sims/models";
import {
  AiOutputError,
  GenerationError,
  LessonGenerationError,
  BudgetExceededError,
} from "./errors";
import { jsonSchemaFor, type JsonSchema } from "./json-schema";
import type { AiProvider, AiRequest, AiResult } from "./provider";
import {
  buildLessonPrompt,
  buildOutlinePrompt,
  buildRepairPrompt,
  buildSystemPrompt,
  type PromptContext,
} from "./prompts";
import { abortReason } from "./retry";
import {
  addUsage,
  courseOutlineSchema,
  emptyUsage,
  generationParamsSchema,
  totalTokens,
  type CourseOutline,
  type FailedLesson,
  type GenerationParams,
  type GenerationParamsInput,
  type NeedsReview,
  type OutlineLesson,
  type OutlineUnit,
  type Usage,
} from "./schemas";
import { MIN_VALID_EXERCISES, checkLessonOutput, type LessonCheck } from "./validate";

export {
  generationParamsSchema,
  courseOutlineSchema,
  type GenerationParams,
  type GenerationParamsInput,
  type CourseOutline,
  type NeedsReview,
  type FailedLesson,
  type Usage,
};

export type LogLevel = "info" | "warn" | "error";

export interface GenerateOptions {
  provider: AiProvider;
  onLog?(level: LogLevel, message: string): void;
  /** Called once stage 1 is done (jobs save it). */
  onOutline?(outline: CourseOutline): void | Promise<void>;
  /** Called after every model call with the running total. */
  onUsage?(total: Usage, delta: Usage): void;
  /** Called after each lesson finishes (or fails). */
  onLessonDone?(info: { lessonId: string; ok: boolean; done: number; total: number }): void;
  signal?: AbortSignal;
  /** Parallel lesson calls. Default 3. */
  concurrency?: number;
  maxTokens?: { outline?: number; lesson?: number };
}

export interface GenerateResult {
  pack: ContentPack;
  outline: CourseOutline;
  needsReview: NeedsReview[];
  /** Lessons that could not be generated; they are not in the pack. */
  failedLessons: FailedLesson[];
  usage: Usage;
  provider: string;
  model: string;
}

/** 1 try + 2 retries that send the exact problems back. */
export const MAX_ATTEMPTS = 3;
export const DEFAULT_MAX_TOKENS = { outline: 16_000, lesson: 32_000 } as const;
const MAX_LESSON_TOKENS = 64_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A type is "ready" when its folder ships examples (stubs don't) and, for simulations, models exist. */
export function isTypeReady(type: ExerciseType): boolean {
  if (getCore(type).examples.length === 0) return false;
  if (type === "simulation" && SIM_MODELS.length === 0) return false;
  return true;
}

/** Requested types (default all) ∪ info_card, minus types that aren't ready yet. */
export function resolveTypes(params: GenerationParams, log: (l: LogLevel, m: string) => void = () => {}): ExerciseType[] {
  const requested = new Set<ExerciseType>(params.types ?? EXERCISE_TYPES);
  if (EXERCISE_TYPES.includes("info_card")) requested.add("info_card");
  const ordered = EXERCISE_TYPES.filter((t) => requested.has(t));
  const notReady = ordered.filter((t) => !isTypeReady(t));
  if (notReady.length) log("warn", `Skipping exercise types that aren't ready yet: ${notReady.join(", ")}`);
  const types = ordered.filter(isTypeReady);
  if (!types.some((t) => getCore(t).graded !== false)) {
    throw new GenerationError("No graded exercise types are available for this course.", [
      `requested: ${[...requested].join(", ")}`,
    ]);
  }
  return types;
}

// ---------------------------------------------------------------------------
// Run context: budget, abort, usage
// ---------------------------------------------------------------------------

interface Run {
  ctx: PromptContext;
  system: string;
  provider: AiProvider;
  log(level: LogLevel, message: string): void;
  call(request: Omit<AiRequest, "system" | "signal">): Promise<AiResult>;
  usage(): Usage;
  abort(reason: unknown): void;
  signal: AbortSignal;
  maxTokens: { outline: number; lesson: number };
}

function createRun(params: GenerationParams, types: ExerciseType[], options: GenerateOptions): Run {
  const controller = new AbortController();
  const outer = options.signal;
  if (outer) {
    if (outer.aborted) controller.abort(outer.reason);
    else outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
  }
  const log = (level: LogLevel, message: string) => options.onLog?.(level, message);
  const ctx: PromptContext = { params, types };
  const system = buildSystemPrompt(ctx);
  let usage = emptyUsage();
  const limit = params.maxTotalTokens;

  return {
    ctx,
    system,
    provider: options.provider,
    log,
    signal: controller.signal,
    maxTokens: {
      outline: options.maxTokens?.outline ?? DEFAULT_MAX_TOKENS.outline,
      lesson: options.maxTokens?.lesson ?? DEFAULT_MAX_TOKENS.lesson,
    },
    usage: () => usage,
    abort: (reason) => controller.abort(reason),
    async call(request) {
      if (controller.signal.aborted) throw abortReason(controller.signal);
      if (limit !== undefined && totalTokens(usage) >= limit) {
        const error = new BudgetExceededError(totalTokens(usage), limit);
        controller.abort(error);
        throw error;
      }
      let result: AiResult;
      try {
        result = await options.provider.generateJSON({ ...request, system, signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) throw abortReason(controller.signal);
        throw error;
      }
      usage = addUsage(usage, result.usage);
      options.onUsage?.(usage, result.usage);
      if (limit !== undefined && totalTokens(usage) > limit) {
        const error = new BudgetExceededError(totalTokens(usage), limit);
        log("error", error.message);
        controller.abort(error);
        throw error;
      }
      return result;
    },
  };
}

let lessonJsonSchema: JsonSchema | null = null;
/** JSON Schema of one lesson (all exercise types). Same object for every call, so prompts cache. */
export function getLessonJsonSchema(): JsonSchema {
  lessonJsonSchema ??= jsonSchemaFor(lessonSchema);
  return lessonJsonSchema;
}

/** Outline JSON Schema with the exerciseTypes enum narrowed to the allowed types. */
export function getOutlineJsonSchema(types: readonly ExerciseType[]): JsonSchema {
  const all = [...EXERCISE_TYPES].sort().join("|");
  const narrow = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(narrow);
    if (typeof node !== "object" || node === null) return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] =
        k === "enum" && Array.isArray(v) && [...v].map(String).sort().join("|") === all ? [...types] : narrow(v);
    }
    return out;
  };
  return narrow(jsonSchemaFor(courseOutlineSchema)) as JsonSchema;
}

// ---------------------------------------------------------------------------
// Stage 1: outline
// ---------------------------------------------------------------------------

const truncate = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…");

/**
 * Make the outline match the requested shape where that can be done without
 * the model: trim extras, drop/position checkpoints, synthesise a missing
 * checkpoint, filter types, de-duplicate ids. Returns the remaining problems.
 */
export function normalizeOutline(
  outline: CourseOutline,
  params: GenerationParams,
  types: readonly ExerciseType[],
  log: (level: LogLevel, message: string) => void = () => {},
): { outline: CourseOutline; problems: string[] } {
  const problems: string[] = [];
  const graded = types.filter((t) => getCore(t).graded !== false);
  const taken = new Set<string>();
  const unique = (id: string) => {
    let out = id;
    for (let n = 2; taken.has(out); n++) out = `${id}-${n}`;
    if (out !== id) log("warn", `Outline: renamed duplicate id "${id}" to "${out}"`);
    taken.add(out);
    return out;
  };
  const fixTypes = (lesson: OutlineLesson): ExerciseType[] => {
    const allowed = [...new Set(lesson.exerciseTypes)].filter((t) => types.includes(t));
    const usable = lesson.kind === "checkpoint" ? allowed.filter((t) => t !== "info_card") : allowed;
    if (usable.some((t) => getCore(t).graded !== false)) return usable;
    return lesson.kind === "checkpoint" ? graded.slice(0, 4) : ["info_card", ...graded.slice(0, 3)];
  };

  if (outline.units.length > params.units) {
    log("warn", `Outline: model planned ${outline.units.length} units; keeping the first ${params.units}`);
  }
  if (outline.units.length < params.units) {
    problems.push(`units: expected ${params.units} units, got ${outline.units.length}`);
  }

  const units: OutlineUnit[] = outline.units.slice(0, params.units).map((unit, u) => {
    const unitId = unique(unit.id);
    const standard = unit.lessons.filter((l) => l.kind === "standard");
    const checkpoints = unit.lessons.filter((l) => l.kind === "checkpoint");
    if (standard.length < params.lessonsPerUnit) {
      problems.push(
        `units.${u}.lessons: expected ${params.lessonsPerUnit} standard lessons in unit "${unit.title}", got ${standard.length}`,
      );
    } else if (standard.length > params.lessonsPerUnit) {
      log("warn", `Outline: unit "${unit.title}" had ${standard.length} standard lessons; keeping ${params.lessonsPerUnit}`);
    }
    const lessons: OutlineLesson[] = standard.slice(0, params.lessonsPerUnit);
    if (params.includeCheckpoints) {
      if (checkpoints.length > 0) {
        lessons.push(checkpoints[0]);
      } else if (lessons.length > 0) {
        log("warn", `Outline: unit "${unit.title}" had no checkpoint; adding one`);
        lessons.push({
          id: `${unitId}-checkpoint`,
          title: truncate(`Checkpoint: ${unit.title}`, 60),
          kind: "checkpoint",
          objectives: ["Review and combine the ideas from this unit"],
          skillTags: [...new Set(lessons.flatMap((l) => l.skillTags))].slice(0, 8),
          exerciseTypes: graded.slice(0, 4),
        });
      }
    } else if (checkpoints.length > 0) {
      log("warn", `Outline: dropped checkpoint lessons from unit "${unit.title}" (checkpoints are off)`);
    }
    return {
      ...unit,
      id: unitId,
      lessons: lessons.map((l) => ({
        ...l,
        id: unique(l.id),
        skillTags: [...new Set(l.skillTags)],
        exerciseTypes: fixTypes(l),
      })),
    };
  });

  return { outline: { ...outline, units }, problems };
}

async function generateOutline(run: Run): Promise<CourseOutline> {
  const { params, types } = run.ctx;
  const basePrompt = buildOutlinePrompt(run.ctx);
  const schema = getOutlineJsonSchema(types);
  let prompt = basePrompt;
  let problems: string[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let raw: unknown;
    try {
      raw = (
        await run.call({
          prompt,
          schema,
          schemaName: "course_outline",
          maxTokens: run.maxTokens.outline,
          meta: { stage: "outline", params, allowedTypes: types, attempt },
        })
      ).data;
    } catch (error) {
      if (!(error instanceof AiOutputError)) throw error;
      problems = [`(reply): ${error.message}`];
      run.log("warn", `Outline attempt ${attempt + 1} unusable: ${error.message}`);
      prompt = buildRepairPrompt(basePrompt, problems, undefined);
      continue;
    }
    const parsed = courseOutlineSchema.safeParse(raw);
    if (parsed.success) {
      const normalized = normalizeOutline(parsed.data, params, types, run.log);
      if (normalized.problems.length === 0) return normalized.outline;
      problems = normalized.problems;
    } else {
      problems = formatIssues(parsed.error);
    }
    run.log("warn", `Outline attempt ${attempt + 1} had ${problems.length} problem(s): ${problems.slice(0, 3).join("; ")}`);
    prompt = buildRepairPrompt(basePrompt, problems, raw);
  }
  throw new GenerationError(`Could not produce a valid course outline after ${MAX_ATTEMPTS} attempts.`, problems);
}

// ---------------------------------------------------------------------------
// Stage 2: lessons
// ---------------------------------------------------------------------------

interface LessonOutcome {
  lesson: Lesson;
  needsReview: NeedsReview[];
  attempts: number;
  usage: Usage;
}

const better = (a: LessonCheck, b: LessonCheck | null) =>
  !b || a.validCount > b.validCount || (a.validCount === b.validCount && a.problems.length <= b.problems.length);

async function writeLesson(
  run: Run,
  outline: CourseOutline,
  unit: OutlineUnit,
  lesson: OutlineLesson,
  extraNotes?: string,
): Promise<LessonOutcome> {
  const { params, types } = run.ctx;
  const exerciseCount = params.exercisesPerLesson;
  const basePrompt = buildLessonPrompt({ ctx: run.ctx, outline, unit, lesson, exerciseCount, extraNotes });
  let prompt = basePrompt;
  let maxTokens = run.maxTokens.lesson;
  let best: LessonCheck | null = null;
  let lastProblems: string[] = [];
  let usage = emptyUsage();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let raw: unknown;
    try {
      const result = await run.call({
        prompt,
        schema: getLessonJsonSchema(),
        schemaName: "lesson",
        maxTokens,
        meta: { stage: "lesson", params, allowedTypes: types, unitId: unit.id, lesson, exerciseCount, attempt },
      });
      usage = addUsage(usage, result.usage);
      raw = result.data;
    } catch (error) {
      if (!(error instanceof AiOutputError)) throw error;
      lastProblems = [`(reply): ${error.message}`];
      if (error.kind === "truncated") maxTokens = Math.min(maxTokens * 2, MAX_LESSON_TOKENS);
      run.log("warn", `Lesson "${lesson.id}" attempt ${attempt + 1} unusable: ${error.message}`);
      prompt = buildRepairPrompt(basePrompt, lastProblems, undefined);
      continue;
    }

    const check = checkLessonOutput(raw, { expected: lesson, allowedTypes: types, exerciseCount });
    if (check.problems.length === 0 && check.lesson) {
      return { lesson: check.lesson, needsReview: [], attempts: attempt + 1, usage };
    }
    if (better(check, best)) best = check;
    lastProblems = check.problems;
    const more = attempt + 1 < MAX_ATTEMPTS ? "; retrying" : "";
    run.log(
      "warn",
      `Lesson "${lesson.id}" attempt ${attempt + 1}: ${check.problems.length} problem(s) — ${check.problems
        .slice(0, 3)
        .join("; ")}${more}`,
    );
    prompt = buildRepairPrompt(basePrompt, check.problems.slice(0, 60), raw);
  }

  if (best?.lesson && best.validCount >= MIN_VALID_EXERCISES) {
    const needsReview: NeedsReview[] = [
      ...(best.lessonProblems.length ? [{ lessonId: lesson.id, errors: best.lessonProblems }] : []),
      ...best.exerciseProblems.map((p) => ({
        lessonId: lesson.id,
        ...(p.exerciseId ? { exerciseId: p.exerciseId } : {}),
        errors: [`dropped from the lesson: ${p.errors[0] ?? "invalid"}`, ...p.errors.slice(1)],
      })),
    ];
    return { lesson: best.lesson, needsReview, attempts: MAX_ATTEMPTS, usage };
  }
  throw new LessonGenerationError(
    lesson.id,
    `Lesson "${lesson.title}" (${lesson.id}) failed after ${MAX_ATTEMPTS} attempts: only ${
      best?.validCount ?? 0
    } valid exercises (need ${MIN_VALID_EXERCISES}).`,
    (best?.problems ?? lastProblems).slice(0, 20),
  );
}

/** Run `worker` over items with a concurrency limit; the first non-lesson error aborts the rest. */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
  onFatal: (error: unknown) => void,
): Promise<void> {
  let next = 0;
  let failed = false;
  let firstError: unknown;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        await worker(items[index], index);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
          onFatal(error);
        }
      }
    }
  });
  await Promise.all(lanes);
  if (failed) throw firstError;
}

/** Rename exercise ids that collide with ids already used in the pack (prefixing the lesson id). */
export function withUniqueIds(lesson: Lesson, taken: Set<string>): Lesson {
  const exercises = lesson.exercises.map((ex) => {
    let id = ex.id;
    if (taken.has(id)) {
      const base = id.startsWith(`${lesson.id}-`) ? id : `${lesson.id}-${id}`;
      id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    }
    taken.add(id);
    return id === ex.id ? ex : { ...ex, id };
  });
  return { ...lesson, exercises };
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "course"
  );
}

function outlineIds(outline: CourseOutline): Set<string> {
  return new Set(outline.units.flatMap((u) => [u.id, ...u.lessons.map((l) => l.id)]));
}

/**
 * Generate a whole draft pack: outline, then one call per lesson
 * (concurrency 3), each validated + autoChecked and retried with the exact
 * problems. Throws GenerationError (bad params / outline / pack),
 * BudgetExceededError, AiAbortError, AiConfigError or AiProviderError.
 */
export async function generatePack(input: GenerationParamsInput, options: GenerateOptions): Promise<GenerateResult> {
  const parsedParams = generationParamsSchema.safeParse(input);
  if (!parsedParams.success) {
    throw new GenerationError("Invalid generation parameters.", formatIssues(parsedParams.error));
  }
  const params = parsedParams.data;
  const log = (level: LogLevel, message: string) => options.onLog?.(level, message);
  const types = resolveTypes(params, log);
  const run = createRun(params, types, options);

  log(
    "info",
    `Planning ${params.units} unit(s) × ${params.lessonsPerUnit} lessons${
      params.includeCheckpoints ? " + checkpoints" : ""
    } on "${params.topic}" with ${options.provider.name}/${options.provider.model}`,
  );
  log("info", `Exercise types: ${types.join(", ")}`);
  const outline = await generateOutline(run);
  const lessonsTotal = outline.units.reduce((n, u) => n + u.lessons.length, 0);
  log("info", `Outline ready: "${outline.title}" — ${outline.units.length} unit(s), ${lessonsTotal} lessons`);
  await options.onOutline?.(outline);

  const tasks = outline.units.flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson })));
  const outcomes = new Map<string, LessonOutcome>();
  const failedLessons: FailedLesson[] = [];
  let done = 0;

  await runPool(
    tasks,
    options.concurrency ?? 3,
    async ({ unit, lesson }, i) => {
      log("info", `[${i + 1}/${tasks.length}] Writing ${lesson.kind} lesson "${lesson.title}" (${lesson.id})`);
      try {
        const outcome = await writeLesson(run, outline, unit, lesson);
        outcomes.set(lesson.id, outcome);
        const dropped = outcome.needsReview.filter((n) => n.exerciseId).length;
        log(
          outcome.needsReview.length ? "warn" : "info",
          `Lesson "${lesson.id}" done: ${outcome.lesson.exercises.length} exercises` +
            (outcome.attempts > 1 ? ` after ${outcome.attempts} attempts` : "") +
            (outcome.needsReview.length ? `, ${dropped} dropped — needs review` : "") +
            ` (${outcome.usage.inputTokens.toLocaleString("en")} in / ${outcome.usage.outputTokens.toLocaleString("en")} out)`,
        );
        done++;
        options.onLessonDone?.({ lessonId: lesson.id, ok: true, done, total: tasks.length });
      } catch (error) {
        if (!(error instanceof LessonGenerationError)) throw error;
        failedLessons.push({ unitId: unit.id, lessonId: lesson.id, title: lesson.title, errors: error.details });
        log("error", error.message.split("\n")[0]);
        done++;
        options.onLessonDone?.({ lessonId: lesson.id, ok: false, done, total: tasks.length });
      }
    },
    (error) => run.abort(error),
  );

  // Assemble in outline order, enforcing pack-wide unique ids.
  const taken = outlineIds(outline);
  const needsReview: NeedsReview[] = [];
  const units: Unit[] = [];
  for (const unit of outline.units) {
    const lessons: Lesson[] = [];
    for (const planned of unit.lessons) {
      const outcome = outcomes.get(planned.id);
      if (!outcome) continue;
      lessons.push(withUniqueIds(outcome.lesson, taken));
      needsReview.push(...outcome.needsReview);
    }
    if (lessons.length === 0) {
      log("error", `Unit "${unit.title}" has no lessons left and was left out`);
      continue;
    }
    units.push({
      id: unit.id,
      title: unit.title,
      description: unit.description,
      ...(unit.color ? { color: unit.color } : {}),
      lessons,
    });
  }
  if (units.length === 0) {
    throw new GenerationError("Every lesson failed; no pack was produced.", failedLessons.map((f) => `${f.lessonId}: ${f.errors[0] ?? "failed"}`));
  }

  const candidate: ContentPack = {
    schemaVersion: SCHEMA_VERSION,
    id: params.packId ?? slugify(outline.title),
    title: outline.title,
    subject: params.subject,
    level: params.level,
    description: outline.description,
    units,
  };
  const validated = validatePack(candidate);
  if (!validated.ok) throw new GenerationError("The assembled pack failed validation.", validated.errors);

  const usage = run.usage();
  const exerciseTotal = units.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.exercises.length, 0), 0);
  log(
    failedLessons.length ? "warn" : "info",
    `Pack "${candidate.id}" assembled: ${units.length} unit(s), ${units.reduce((n, u) => n + u.lessons.length, 0)} lessons, ` +
      `${exerciseTotal} exercises; ${needsReview.length} review item(s), ${failedLessons.length} failed lesson(s). ` +
      `Tokens: ${usage.inputTokens.toLocaleString("en")} in / ${usage.outputTokens.toLocaleString("en")} out`,
  );
  return {
    pack: validated.pack,
    outline,
    needsReview,
    failedLessons,
    usage,
    provider: options.provider.name,
    model: options.provider.model,
  };
}

// ---------------------------------------------------------------------------
// Regenerate one lesson
// ---------------------------------------------------------------------------

/** An outline reconstructed from an existing pack (for regenerating lessons of any pack). */
export function outlineFromPack(pack: ContentPack): CourseOutline {
  return {
    title: pack.title,
    description: pack.description,
    units: pack.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      description: unit.description,
      ...(unit.color ? { color: unit.color } : {}),
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.kind,
        objectives: lesson.objectives,
        skillTags: [...new Set(lesson.exercises.flatMap((e) => e.skillTags))].slice(0, 8),
        exerciseTypes: [...new Set(lesson.exercises.map((e) => e.type))].slice(0, 8),
      })),
    })),
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/** Best-effort generation params for a pack that has none recorded (e.g. imported or demo packs). */
export function paramsFromPack(pack: ContentPack): GenerationParams {
  const lessons = pack.units.flatMap((u) => u.lessons);
  const standard = lessons.filter((l) => l.kind === "standard");
  const avgExercises = lessons.reduce((n, l) => n + l.exercises.length, 0) / Math.max(1, lessons.length);
  return generationParamsSchema.parse({
    subject: truncate(pack.subject, 40),
    topic: truncate(pack.title, 200),
    level: truncate(pack.level, 60),
    units: clamp(pack.units.length, 1, 10),
    lessonsPerUnit: clamp(standard.length / Math.max(1, pack.units.length), 2, 8),
    exercisesPerLesson: clamp(avgExercises, 8, 15),
    includeCheckpoints: lessons.some((l) => l.kind === "checkpoint"),
  });
}

export interface RegenerateOptions extends Omit<GenerateOptions, "provider" | "onOutline" | "onLessonDone" | "concurrency"> {
  /** The job's outline (needed to regenerate a lesson that failed and isn't in the pack). */
  outline?: CourseOutline;
  /** Extra instructions for the model, e.g. "make it harder" or reviewer notes. */
  notes?: string;
}

export interface RegenerateResult {
  pack: ContentPack;
  lesson: Lesson;
  needsReview: NeedsReview[];
  usage: Usage;
}

/**
 * Write one lesson again (same id) and put it into the pack in its outline
 * position, replacing the old version. Throws LessonGenerationError if the
 * new version is unusable (the pack is left untouched).
 */
export async function regenerateLesson(
  pack: ContentPack,
  lessonId: string,
  input: GenerationParamsInput,
  provider: AiProvider,
  options: RegenerateOptions = {},
): Promise<RegenerateResult> {
  const parsedParams = generationParamsSchema.safeParse(input);
  if (!parsedParams.success) {
    throw new GenerationError("Invalid generation parameters.", formatIssues(parsedParams.error));
  }
  const params = parsedParams.data;
  const log = (level: LogLevel, message: string) => options.onLog?.(level, message);
  const types = resolveTypes(params, log);
  const run = createRun(params, types, { ...options, provider });

  const outline = options.outline ?? outlineFromPack(pack);
  const unitIndex = outline.units.findIndex((u) => u.lessons.some((l) => l.id === lessonId));
  if (unitIndex === -1) throw new GenerationError(`Lesson "${lessonId}" is not in this pack or its outline.`);
  const unit = outline.units[unitIndex];
  const planned = unit.lessons.find((l) => l.id === lessonId)!;

  log("info", `Regenerating lesson "${planned.title}" (${lessonId}) with ${provider.name}/${provider.model}`);
  const outcome = await writeLesson(run, outline, unit, planned, options.notes);

  // Ids already used by everything except the lesson being replaced.
  const taken = new Set<string>();
  for (const u of pack.units) {
    taken.add(u.id);
    for (const l of u.lessons) {
      taken.add(l.id);
      if (l.id !== lessonId) for (const e of l.exercises) taken.add(e.id);
    }
  }
  const lesson = withUniqueIds(outcome.lesson, taken);

  const order = (u: OutlineUnit) => u.lessons.map((l) => l.id);
  let units = pack.units.map((u) => ({ ...u, lessons: [...u.lessons] }));
  let target = units.find((u) => u.id === unit.id);
  if (!target) {
    // Insert the unit at its outline position.
    target = { id: unit.id, title: unit.title, description: unit.description, ...(unit.color ? { color: unit.color } : {}), lessons: [] };
    const outlineOrder = outline.units.map((u) => u.id);
    const pos = units.filter((u) => outlineOrder.indexOf(u.id) !== -1 && outlineOrder.indexOf(u.id) < unitIndex).length;
    units = [...units.slice(0, pos), target, ...units.slice(pos)];
  }
  const existing = target.lessons.findIndex((l) => l.id === lessonId);
  if (existing !== -1) {
    target.lessons[existing] = lesson;
  } else {
    const ids = order(unit);
    const myPos = ids.indexOf(lessonId);
    const pos = target.lessons.filter((l) => ids.indexOf(l.id) !== -1 && ids.indexOf(l.id) < myPos).length;
    target.lessons.splice(pos, 0, lesson);
  }

  const validated = validatePack({ ...pack, units });
  if (!validated.ok) throw new GenerationError("The updated pack failed validation.", validated.errors);
  const usage = run.usage();
  log(
    outcome.needsReview.length ? "warn" : "info",
    `Lesson "${lessonId}" regenerated: ${lesson.exercises.length} exercises, ${outcome.needsReview.length} review item(s). ` +
      `Tokens: ${usage.inputTokens.toLocaleString("en")} in / ${usage.outputTokens.toLocaleString("en")} out`,
  );
  return { pack: validated.pack, lesson, needsReview: outcome.needsReview, usage };
}

