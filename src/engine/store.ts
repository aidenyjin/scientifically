"use client";

import { create } from "zustand";
import type { Exercise } from "@/content/registry";
import {
  advance,
  check,
  createLesson,
  recordHint,
  refillHearts,
  setResponse,
  type LessonOptions,
  type LessonState,
} from "./lesson";

interface LessonStore {
  lesson: LessonState | null;
  startedAt: number;
  start(exercises: Exercise[], options: LessonOptions): void;
  respond(response: unknown): void;
  check(): void;
  skip(): void;
  advance(): void;
  refill(hearts: number): void;
  hint(): void;
  reset(): void;
}

/** Thin Zustand wrapper around the pure engine in ./lesson.ts. */
export const useLessonStore = create<LessonStore>((set) => {
  const apply = (fn: (s: LessonState) => LessonState) =>
    set((store) => (store.lesson ? { lesson: fn(store.lesson) } : store));
  return {
    lesson: null,
    startedAt: 0,
    start: (exercises, options) => set({ lesson: createLesson(exercises, options), startedAt: Date.now() }),
    respond: (response) => apply((s) => setResponse(s, response)),
    check: () => apply((s) => check(s)),
    skip: () => apply((s) => check(s, { skip: true })),
    advance: () => apply(advance),
    refill: (hearts) => apply((s) => refillHearts(s, hearts)),
    hint: () => apply(recordHint),
    reset: () => set({ lesson: null, startedAt: 0 }),
  };
});
