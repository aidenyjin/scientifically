import { autoCheckExercise, exerciseSchema, isGraded, type Exercise, type ExerciseType } from "@/content/registry";
import { formatIssues, lessonSchema, validatePack, type ContentPack, type Lesson } from "@/content/schema/course";
import type { OutlineLesson } from "./schemas";

/** Lessons are kept (with problems flagged) only if at least this many valid exercises survive. */
export const MIN_VALID_EXERCISES = 5;

export interface ExerciseProblem {
  index: number;
  exerciseId?: string;
  type?: string;
  errors: string[];
}

export interface LessonCheck {
  /** The lesson built from the valid exercises only (null if the output had no usable exercises array). */
  lesson: Lesson | null;
  validCount: number;
  /** Problems with individual exercises (these exercises are not in `lesson`). */
  exerciseProblems: ExerciseProblem[];
  /** Problems with the lesson as a whole. */
  lessonProblems: string[];
  /** Every problem as one readable line with a JSON path, for the repair prompt and logs. */
  problems: string[];
}

export interface LessonCheckOptions {
  expected: OutlineLesson;
  allowedTypes: readonly ExerciseType[];
  exerciseCount: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Text-level problems Zod can't see: LaTeX/HTML instead of the RichText markup. */
export function markupProblems(value: unknown, path = ""): string[] {
  const out: string[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") {
      if (/\$[^$]+\$/.test(v) || /\\(frac|text|mathrm|times|cdot|sqrt|left|right)\b|\\\(|\\\[/.test(v)) {
        out.push(`${p || "(text)"}: uses LaTeX; use the RichText markup (H_{2}O, m/s^{2}) and Unicode symbols instead`);
      } else if (/<\/?(sub|sup|b|i|em|strong|br|p|span)\b[^>]*>/i.test(v)) {
        out.push(`${p || "(text)"}: uses HTML tags; use **bold**, *italic*, _{sub} and ^{sup} instead`);
      }
    } else if (Array.isArray(v)) v.forEach((item, i) => walk(item, p ? `${p}.${i}` : String(i)));
    else if (isRecord(v)) for (const [k, item] of Object.entries(v)) walk(item, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return out;
}

/**
 * Validate one lesson as returned by the model, exercise by exercise, so a
 * few bad exercises don't throw away the good ones. id / title / kind come
 * from the outline (it is authoritative); objectives from the model if valid.
 */
export function checkLessonOutput(raw: unknown, opts: LessonCheckOptions): LessonCheck {
  const lessonProblems: string[] = [];
  const exerciseProblems: ExerciseProblem[] = [];
  const valid: Exercise[] = [];

  if (!isRecord(raw)) {
    const problems = ["(root): expected a JSON object for the lesson"];
    return { lesson: null, validCount: 0, exerciseProblems, lessonProblems: problems, problems };
  }

  const objectives = lessonSchema.shape.objectives.safeParse(raw.objectives);
  if (!objectives.success) {
    lessonProblems.push(...objectives.error.issues.map((i) => `${["objectives", ...i.path].join(".")}: ${i.message}`));
  }

  const exercisesRaw = raw.exercises;
  if (!Array.isArray(exercisesRaw)) {
    lessonProblems.push("exercises: expected an array of exercises");
  } else {
    const seenIds = new Set<string>();
    exercisesRaw.forEach((item, index) => {
      const id = isRecord(item) && typeof item.id === "string" ? item.id : undefined;
      const type = isRecord(item) && typeof item.type === "string" ? item.type : undefined;
      const label = `exercises.${index}${id ? ` ("${id}"${type ? `, ${type}` : ""})` : ""}`;
      const errors: string[] = [];

      if (type && !opts.allowedTypes.includes(type as ExerciseType)) {
        errors.push(`type "${type}" is not allowed in this course (allowed: ${opts.allowedTypes.join(", ")})`);
      }
      const parsed = errors.length ? null : exerciseSchema.safeParse(item);
      if (parsed && !parsed.success) errors.push(...formatIssues(parsed.error));
      if (parsed?.success) {
        errors.push(...autoCheckExercise(parsed.data));
        errors.push(...markupProblems(parsed.data));
        if (seenIds.has(parsed.data.id)) errors.push(`duplicate exercise id "${parsed.data.id}" in this lesson`);
      }

      if (errors.length || !parsed?.success) {
        exerciseProblems.push({ index, exerciseId: id, type, errors: errors.map((e) => `${label}: ${e}`) });
      } else {
        seenIds.add(parsed.data.id);
        valid.push(parsed.data);
      }
    });

    const graded = valid.filter(isGraded).length;
    const min = Math.max(MIN_VALID_EXERCISES, opts.exerciseCount - 2);
    if (exercisesRaw.length < min) {
      lessonProblems.push(`exercises: expected ${opts.exerciseCount} exercises, got ${exercisesRaw.length}`);
    } else if (exercisesRaw.length > 20) {
      lessonProblems.push(`exercises: at most 20 exercises allowed, got ${exercisesRaw.length}`);
    }
    if (valid.length > 0 && graded < Math.min(MIN_VALID_EXERCISES, valid.length)) {
      lessonProblems.push(`exercises: only ${graded} graded exercises; most exercises must be graded (not info_card)`);
    }
  }

  const exercises = valid.slice(0, 20);
  const lesson: Lesson | null =
    exercises.length > 0
      ? {
          id: opts.expected.id,
          title: opts.expected.title,
          kind: opts.expected.kind,
          objectives: objectives.success ? objectives.data : opts.expected.objectives,
          exercises,
        }
      : null;

  const problems = [...lessonProblems, ...exerciseProblems.flatMap((p) => p.errors)];
  return { lesson, validCount: exercises.length, exerciseProblems, lessonProblems, problems };
}

export interface PackCheck {
  ok: boolean;
  pack: ContentPack | null;
  /** Schema / cross-reference errors (pack is unusable) and autoCheck problems (content is wrong). */
  errors: string[];
  stats: { units: number; lessons: number; exercises: number } | null;
}

/** Full check of a pack file: Zod schema + id refinements + every exercise's autoCheck. */
export function checkPack(input: unknown): PackCheck {
  const result = validatePack(input);
  if (!result.ok) return { ok: false, pack: null, errors: result.errors, stats: null };
  const pack = result.pack;
  const errors: string[] = [];
  let lessons = 0;
  let exercises = 0;
  pack.units.forEach((unit, u) =>
    unit.lessons.forEach((lesson, l) => {
      lessons++;
      lesson.exercises.forEach((ex, e) => {
        exercises++;
        const path = `units.${u}.lessons.${l}.exercises.${e} ("${ex.id}", ${ex.type})`;
        for (const p of autoCheckExercise(ex)) errors.push(`${path}: ${p}`);
        for (const p of markupProblems(ex)) errors.push(`${path}: ${p}`);
      });
    }),
  );
  return { ok: errors.length === 0, pack, errors, stats: { units: pack.units.length, lessons, exercises } };
}

/** Parse JSON text and check it; JSON syntax errors become readable errors. */
export function checkPackJson(text: string): PackCheck {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, pack: null, errors: [`(file): not valid JSON — ${(error as Error).message}`], stats: null };
  }
  return checkPack(data);
}

