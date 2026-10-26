"use client";

import { solve } from "@/content/solve";
import { currentExercise } from "./lesson";
import { useLessonStore } from "./store";

/**
 * Test-only bridge for end-to-end tests: lets Playwright read the current
 * exercise and answer it correctly, whatever its type. Loaded only in
 * development or when NEXT_PUBLIC_E2E=1 (see LessonPlayer).
 */
export function install(): void {
  const api = {
    status: () => useLessonStore.getState().lesson?.status ?? null,
    exercise: () => {
      const s = useLessonStore.getState().lesson;
      return s ? currentExercise(s) : null;
    },
    answerCorrectly: () => {
      const store = useLessonStore.getState();
      const ex = store.lesson ? currentExercise(store.lesson) : null;
      if (!ex) return;
      store.respond(solve(ex));
    },
  };
  (window as unknown as { __sci: typeof api }).__sci = api;
}
