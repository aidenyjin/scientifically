import { gradeExercise, isGraded, type Exercise } from "@/content/registry";
import type { GradeResult } from "@/content/types";

/**
 * Lesson state machine. Pure: no React, no clock. The Zustand store in
 * ./store.ts wraps it for the player UI.
 *
 *   answering ──check──▶ correct | incorrect ──continue──▶ answering (next)
 *                                                    └──▶ complete | failed
 */
export type LessonMode = "standard" | "checkpoint" | "practice";

export type LessonStatus = "answering" | "correct" | "incorrect" | "complete" | "failed";

export interface QueueItem {
  exerciseIndex: number;
  /** True when this is the second try after a wrong answer. */
  retry: boolean;
}

export interface LessonState {
  exercises: Exercise[];
  mode: LessonMode;
  queue: QueueItem[];
  position: number;
  status: LessonStatus;
  /** null = unlimited (practice lessons, or unlimited-hearts boost). */
  hearts: number | null;
  /** Hearts lost since the wallet was last synced (start of lesson, or a gem refill). */
  heartsLost: number;
  response: unknown;
  lastGrade: GradeResult | null;
  /** Exercise indices answered correctly (at any try). */
  solved: number[];
  /** Exercise indices that were wrong at least once. */
  missed: number[];
  /** Exercise indices whose retry was also wrong (finished without solving). */
  exhausted: number[];
  combo: number;
  bestCombo: number;
  hintsUsed: number;
  /** Set on the check that drops hearts to 0; the next continue fails the lesson. */
  outOfHearts: boolean;
}

export interface LessonOptions {
  mode: LessonMode;
  /** Current hearts, or null for unlimited. */
  hearts: number | null;
}

export function createLesson(exercises: Exercise[], options: LessonOptions): LessonState {
  if (exercises.length === 0) throw new Error("A lesson needs at least one exercise");
  return {
    exercises,
    mode: options.mode,
    queue: exercises.map((_, i) => ({ exerciseIndex: i, retry: false })),
    position: 0,
    status: "answering",
    hearts: options.mode === "practice" ? null : options.hearts,
    heartsLost: 0,
    response: null,
    lastGrade: null,
    solved: [],
    missed: [],
    exhausted: [],
    combo: 0,
    bestCombo: 0,
    hintsUsed: 0,
    outOfHearts: false,
  };
}

export function currentItem(state: LessonState): QueueItem | null {
  return state.queue[state.position] ?? null;
}

export function currentExercise(state: LessonState): Exercise | null {
  const item = currentItem(state);
  return item ? state.exercises[item.exerciseIndex] : null;
}

export function setResponse(state: LessonState, response: unknown): LessonState {
  if (state.status !== "answering") return state;
  return { ...state, response };
}

export function canCheck(state: LessonState): boolean {
  return state.status === "answering" && state.response !== null && state.response !== undefined;
}

/** Grade the current response. `skip` treats it as wrong ("Can't answer now"). */
export function check(state: LessonState, { skip = false } = {}): LessonState {
  if (state.status !== "answering") return state;
  const item = currentItem(state);
  if (!item) return state;
  const exercise = state.exercises[item.exerciseIndex];
  if (!skip && !canCheck(state)) return state;

  const grade: GradeResult = skip
    ? { ...gradeExercise(exercise, state.response ?? {}), correct: false }
    : gradeExercise(exercise, state.response);

  if (!isGraded(exercise)) {
    return { ...state, status: "correct", lastGrade: { ...grade, correct: true } };
  }

  if (grade.correct) {
    const combo = state.combo + 1;
    return {
      ...state,
      status: "correct",
      lastGrade: grade,
      solved: addUnique(state.solved, item.exerciseIndex),
      combo,
      bestCombo: Math.max(state.bestCombo, combo),
    };
  }

  const hearts = state.hearts === null ? null : Math.max(0, state.hearts - 1);
  const queue = item.retry
    ? state.queue
    : [...state.queue, { exerciseIndex: item.exerciseIndex, retry: true }];

  return {
    ...state,
    status: "incorrect",
    lastGrade: grade,
    hearts,
    heartsLost: state.heartsLost + (state.hearts === null ? 0 : 1),
    queue,
    missed: addUnique(state.missed, item.exerciseIndex),
    exhausted: item.retry ? addUnique(state.exhausted, item.exerciseIndex) : state.exhausted,
    combo: 0,
    outOfHearts: hearts === 0,
  };
}

/** Move past the feedback to the next exercise, or finish. */
export function advance(state: LessonState): LessonState {
  if (state.status !== "correct" && state.status !== "incorrect") return state;
  if (state.outOfHearts) return { ...state, status: "failed" };
  const position = state.position + 1;
  if (position >= state.queue.length) return { ...state, position, status: "complete", response: null };
  return { ...state, position, status: "answering", response: null, lastGrade: null };
}

/** Restore hearts after a gem refill on the out-of-hearts screen, and carry on. */
export function refillHearts(state: LessonState, hearts: number): LessonState {
  if (!state.outOfHearts && state.status !== "failed") return { ...state, hearts, heartsLost: 0 };
  // The wallet now holds `hearts`, so losses before the refill are already settled.
  const resumed: LessonState = {
    ...state,
    hearts,
    heartsLost: 0,
    outOfHearts: false,
    status: state.status === "failed" ? "incorrect" : state.status,
  };
  return advance(resumed);
}

export function recordHint(state: LessonState): LessonState {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

/** 0–1. Never moves backwards: counts exercises that are done for good. */
export function progress(state: LessonState): number {
  const gradedCount = state.exercises.length;
  const done = new Set([...state.solved, ...state.exhausted]);
  // ungraded cards count as done once passed
  state.queue.slice(0, state.position + (state.status === "correct" ? 1 : 0)).forEach((q) => {
    if (!isGraded(state.exercises[q.exerciseIndex])) done.add(q.exerciseIndex);
  });
  if (state.status === "complete") return 1;
  return done.size / gradedCount;
}

export interface LessonStats {
  mode: LessonMode;
  /** Graded exercises in the lesson. */
  total: number;
  /** Graded exercises right on the first try. */
  firstTryCorrect: number;
  /** 0–1, first-try accuracy over graded exercises. */
  accuracy: number;
  perfect: boolean;
  bestCombo: number;
  heartsLost: number;
  /** Ids of exercises that were wrong at least once. */
  mistakeIds: string[];
  /** Per-exercise outcome for SRS / attempts logging. */
  outcomes: { exerciseId: string; skillTags: string[]; correctFirstTry: boolean }[];
}

export function lessonStats(state: LessonState): LessonStats {
  const graded = state.exercises
    .map((ex, i) => ({ ex, i }))
    .filter(({ ex }) => isGraded(ex));
  const missed = new Set(state.missed);
  const firstTryCorrect = graded.filter(({ i }) => !missed.has(i)).length;
  const total = graded.length;
  return {
    mode: state.mode,
    total,
    firstTryCorrect,
    accuracy: total === 0 ? 1 : firstTryCorrect / total,
    perfect: total > 0 && firstTryCorrect === total,
    bestCombo: state.bestCombo,
    heartsLost: state.heartsLost,
    mistakeIds: state.missed.map((i) => state.exercises[i].id),
    outcomes: graded.map(({ ex, i }) => ({
      exerciseId: ex.id,
      skillTags: ex.skillTags,
      correctFirstTry: !missed.has(i),
    })),
  };
}

function addUnique(list: number[], value: number): number[] {
  return list.includes(value) ? list : [...list, value];
}
