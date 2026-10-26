import type { ComponentType } from "react";
import type { ZodType } from "zod";
import type { ExerciseBase } from "./schema/exercise-base";

export type GradeResult = {
  correct: boolean;
  /** Extra feedback for this specific answer, e.g. "Balanced, but simplify the coefficients". */
  feedback?: string;
  /** Human-readable correct answer, shown in the feedback bar when wrong. */
  correctAnswerText: string;
};

export type ExerciseStatus = "answering" | "correct" | "incorrect";

export interface ExerciseProps<E, R> {
  exercise: E;
  /** Lock input when not "answering"; show right/wrong styling after a check. */
  status: ExerciseStatus;
  /** Call with null when the answer is incomplete (disables Check). */
  onChange(response: R | null): void;
  /** Seed for deterministic shuffles. Same seed → same order. */
  seed: number;
  /**
   * Called by self-grading types (e.g. match_pairs) that finish on their own;
   * the player then runs Check automatically.
   */
  onSubmit?(): void;
}

/** Server-safe half of an exercise type: no React. */
export interface ExerciseCore<E extends ExerciseBase & { type: string }, R> {
  type: E["type"];
  /** Short human label for admin UI, e.g. "Multiple choice". */
  label: string;
  schema: ZodType<E>;
  responseSchema: ZodType<R>;
  grade(exercise: E, response: R): GradeResult;
  /**
   * Content checks beyond the schema, run on AI output. Return a list of
   * problems (empty means OK).
   */
  autoCheck?(exercise: E): string[];
  /** A few valid, scientifically sound examples. Used by the demo pack and AI prompts. */
  examples: E[];
  /** 1–3 sentences telling the AI how to write this type well. */
  promptNotes: string;
  /** False for non-graded types (info_card). Defaults to true. */
  graded?: boolean;
}

export type ExerciseComponent<E, R> = ComponentType<ExerciseProps<E, R>>;
