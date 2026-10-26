"use client";

import { Check } from "lucide-react";
import { createElement, useEffect, useMemo } from "react";
import { getCore, type Exercise } from "@/content/registry";
import { getView } from "@/content/registry.client";
import { solve } from "@/content/solve";
import type { ExerciseStatus } from "@/content/types";
import { RichText } from "@/components/ui/RichText";
import { isTypingTarget } from "@/lib/keyboard";

const noop = () => {};

/**
 * Types whose locked "correct" view highlights the right answer on its own
 * (the answer is one of the visible options or targets). Every other type
 * keeps its answer in component state, so locking it with nothing entered
 * paints empty blanks red or answers as "missed" — those are shown as the
 * learner first sees them instead, with the answer key underneath.
 */
function revealsKey(exercise: Exercise): boolean {
  switch (exercise.type) {
    case "multiple_choice":
    case "true_false":
    case "spot_error":
    case "dialogue":
    case "graph_plot":
      return true;
    case "graph_read":
      return exercise.question.mode === "choice";
    default:
      return false;
  }
}

/** Human-readable correct answer, from the type's own grader fed its solved response. */
function answerKey(exercise: Exercise): string | null {
  const core = getCore(exercise.type);
  if (core.graded === false) return null;
  try {
    return core.grade(exercise as never, solve(exercise) as never).correctAnswerText;
  } catch {
    return "Couldn't work out the answer — check this exercise's JSON.";
  }
}

/**
 * Renders an exercise with its real component as an answer key. `inert`
 * stops focus and clicks; the key guard stops shortcuts.
 */
export function ExercisePreview({ exercise }: { exercise: Exercise }) {
  const reveal = revealsKey(exercise);
  const status: ExerciseStatus = reveal ? "correct" : "answering";
  const key = useMemo(() => answerKey(exercise), [exercise]);
  useShortcutGuard(status === "answering");

  return (
    <div className="grid gap-4">
      <div inert className="grid gap-4">
        <p className="font-display text-ink text-lg leading-snug font-semibold">
          <RichText text={exercise.prompt} />
        </p>
        {createElement(getView(exercise.type), { exercise, status, onChange: noop, seed: 7 })}
      </div>
      {key && !reveal && (
        <p className="border-correct/40 bg-correct-soft text-correct-ink flex items-start gap-2.5 rounded-2xl border-2 px-4 py-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden />
          <span>
            <span className="font-bold">Answer: </span>
            <RichText text={key} />
          </span>
        </p>
      )}
    </div>
  );
}

/*
 * Previews in the "answering" state register their keyboard shortcuts
 * (digits, letters, Enter…) on window, so pressing "1" on the review page
 * would tick options in every card. One capture listener, shared by all
 * previews, stops those keys before they reach the bubble-phase handlers.
 * It never calls preventDefault (Enter/Space still press focused buttons,
 * arrows still scroll) and ignores typing targets and open dialogs.
 */
let guards = 0;
function blockShortcuts(event: KeyboardEvent) {
  if (event.key === "Tab" || event.key === "Escape") return;
  const target = event.target;
  if (isTypingTarget(target)) return;
  if (target instanceof Element && target.closest("[role=dialog]")) return;
  event.stopPropagation();
}

function useShortcutGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (guards++ === 0) window.addEventListener("keydown", blockShortcuts, true);
    return () => {
      if (--guards === 0) window.removeEventListener("keydown", blockShortcuts, true);
    };
  }, [enabled]);
}
