"use client";

import { createElement } from "react";
import type { Exercise } from "@/content/registry";
import { getView } from "@/content/registry.client";
import { RichText } from "@/components/ui/RichText";

const noop = () => {};

/**
 * Renders an exercise with its real component in the locked "correct" state,
 * which works as an answer key. `inert` stops focus, clicks and shortcuts.
 */
export function ExercisePreview({ exercise }: { exercise: Exercise }) {
  return (
    <div inert className="grid gap-4">
      <p className="font-display text-lg leading-snug font-semibold text-ink">
        <RichText text={exercise.prompt} />
      </p>
      {createElement(getView(exercise.type), { exercise, status: "correct", onChange: noop, seed: 7 })}
    </div>
  );
}
