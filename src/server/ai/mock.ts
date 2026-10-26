import { exerciseCores, getCore, type Exercise, type ExerciseType } from "@/content/registry";
import type { Lesson } from "@/content/schema/course";
import { AiOutputError } from "./errors";
import type { AiProvider, AiRequest, AiResult, GenerationMeta } from "./provider";
import type { CourseOutline, GenerationParams, OutlineLesson } from "./schemas";

/**
 * Deterministic provider for tests, CI and offline development
 * (AI_PROVIDER=mock). It never calls a network: outlines are built from the
 * request's params and lessons from the registry's `examples` (ids rewritten
 * to be unique). Faults can be injected to exercise the retry path.
 */
export type MockBreak =
  /** Make the first graded exercise fail the Zod schema (difficulty 9). */
  | "schema"
  /** Make a multiple_choice exercise fail its autoCheck (duplicate options); falls back to "schema". */
  | "autocheck"
  /** Return only `keep` exercises (default 3), e.g. to fall below the minimum. */
  | "too-few"
  /** Simulate a reply that isn't JSON (provider throws AiOutputError). */
  | "invalid-json"
  /** Simulate a reply cut off at max_tokens. */
  | "truncated"
  /** Custom mutation of the default output. */
  | ((output: unknown, request: AiRequest) => unknown);

export interface MockFault {
  stage?: GenerationMeta["stage"];
  /** Only this lesson (lesson stage). */
  lessonId?: string;
  /** Which attempts (0-based) to break; default every attempt. */
  attempts?: number[];
  break: MockBreak;
  /** For "too-few". */
  keep?: number;
}

export interface MockProviderOptions {
  model?: string;
  faults?: MockFault[];
  /** Fake latency per call, ms (default 0). */
  delayMs?: number;
}

export interface MockProvider extends AiProvider {
  /** Every request received, in order (for assertions). */
  readonly calls: AiRequest[];
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const truncate = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…");
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "") || "topic";
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Types that have examples, in registry order. */
function exampleTypes(allowed: readonly ExerciseType[]): ExerciseType[] {
  return exerciseCores
    .map((c) => c.type as ExerciseType)
    .filter((t) => allowed.includes(t) && getCore(t).examples.length > 0);
}

export function mockOutline(params: GenerationParams, allowed: readonly ExerciseType[]): CourseOutline {
  const types = exampleTypes(allowed);
  const graded = types.filter((t) => getCore(t).graded !== false);
  const topic = titleCase(params.topic);
  const base = slug(params.topic);
  return {
    title: truncate(`${topic}: a ${params.subject} course`, 80),
    description: truncate(`A mock course on ${params.topic} for ${params.level} learners, built from example exercises.`, 300),
    units: Array.from({ length: params.units }, (_, u) => {
      const unitId = `${base}-u${u + 1}`;
      const lessons: OutlineLesson[] = Array.from({ length: params.lessonsPerUnit }, (_, l) => ({
        id: `${unitId}-l${l + 1}`,
        title: truncate(`${topic} ${u + 1}.${l + 1}`, 60),
        kind: "standard" as const,
        objectives: [truncate(`Explain key idea ${l + 1} of unit ${u + 1}`, 160)],
        skillTags: [`${base}.unit-${u + 1}.idea-${l + 1}`],
        exerciseTypes: ["info_card" as ExerciseType, ...graded.slice(l % Math.max(1, graded.length)), ...graded]
          .filter((t, i, all) => types.includes(t) && all.indexOf(t) === i)
          .slice(0, 5),
      }));
      if (params.includeCheckpoints) {
        lessons.push({
          id: `${unitId}-checkpoint`,
          title: truncate(`Checkpoint ${u + 1}`, 60),
          kind: "checkpoint",
          objectives: ["Review the unit"],
          skillTags: [...new Set(lessons.flatMap((l) => l.skillTags))],
          exerciseTypes: graded.slice(0, 5),
        });
      }
      return {
        id: unitId,
        title: truncate(`Unit ${u + 1}: ${topic}`, 60),
        description: truncate(`Part ${u + 1} of the ${params.topic} course.`, 200),
        lessons,
      };
    }),
  };
}

export function mockLesson(lesson: OutlineLesson, count: number, allowed: readonly ExerciseType[]): Lesson {
  const available = exampleTypes(allowed);
  const planned = lesson.exerciseTypes.filter((t) => available.includes(t));
  const rest = available.filter((t) => !planned.includes(t));
  let order = [...planned, ...rest];
  if (lesson.kind === "checkpoint") order = order.filter((t) => t !== "info_card");
  const pool: Exercise[] = order.flatMap((t) => getCore(t).examples as Exercise[]);
  const infoFirst = pool.filter((e) => e.type === "info_card").slice(0, 1);
  const graded = pool.filter((e) => e.type !== "info_card");
  const source = graded.length ? graded : pool;
  const exercises: Exercise[] = [];
  for (const ex of infoFirst) exercises.push(ex);
  for (let i = 0; exercises.length < count && source.length > 0; i++) exercises.push(source[i % source.length]);
  return {
    id: lesson.id,
    title: lesson.title,
    kind: lesson.kind,
    objectives: lesson.objectives,
    exercises: exercises.map((ex, i) => ({
      ...structuredClone(ex),
      id: `${lesson.id}-${i + 1}-${ex.id}`.slice(0, 80).replace(/-+$/g, ""),
    })),
  };
}

function applyBreak(fault: MockFault, output: unknown, request: AiRequest): unknown {
  const kind = fault.break;
  if (typeof kind === "function") return kind(structuredClone(output), request);
  if (kind === "invalid-json") throw new AiOutputError("invalid_json", "The reply was not valid JSON.", "{not json");
  if (kind === "truncated") throw new AiOutputError("truncated", "The reply hit max_tokens before it was complete.");
  const lesson = structuredClone(output) as { exercises?: Record<string, unknown>[] };
  const exercises = lesson.exercises ?? [];
  if (kind === "too-few") {
    lesson.exercises = exercises.slice(0, fault.keep ?? 3);
    return lesson;
  }
  if (kind === "autocheck") {
    const mc = exercises.find((e) => e.type === "multiple_choice" && Array.isArray(e.options));
    if (mc && Array.isArray(mc.options)) {
      mc.options = [mc.options[0], mc.options[0], ...mc.options.slice(2)];
      return lesson;
    }
  }
  const target = exercises.find((e) => e.type !== "info_card") ?? exercises[0];
  if (target) target.difficulty = 9;
  return lesson;
}

function matches(fault: MockFault, meta: GenerationMeta): boolean {
  if (fault.stage && fault.stage !== meta.stage) return false;
  if (fault.lessonId && (meta.stage !== "lesson" || meta.lesson.id !== fault.lessonId)) return false;
  if (fault.attempts && !fault.attempts.includes(meta.attempt)) return false;
  return true;
}

export function createMockProvider(options: MockProviderOptions = {}): MockProvider {
  const calls: AiRequest[] = [];
  return {
    name: "mock",
    model: options.model ?? "mock-1",
    calls,
    async generateJSON(request): Promise<AiResult> {
      calls.push(request);
      if (request.signal?.aborted) throw request.signal.reason instanceof Error ? request.signal.reason : new Error("aborted");
      if (options.delayMs) await new Promise((r) => setTimeout(r, options.delayMs));
      const meta = request.meta;
      if (!meta) throw new AiOutputError("no_output", "The mock provider needs request.meta to know what to build.");

      let output: unknown =
        meta.stage === "outline"
          ? mockOutline(meta.params, meta.allowedTypes)
          : mockLesson(meta.lesson, meta.exerciseCount, meta.allowedTypes);
      for (const fault of options.faults ?? []) {
        if (matches(fault, meta)) output = applyBreak(fault, output, request);
      }
      return {
        data: output,
        usage: {
          inputTokens: estimateTokens(request.system) + estimateTokens(request.prompt),
          outputTokens: estimateTokens(JSON.stringify(output)),
        },
      };
    },
  };
}
