"use client";

import { Character } from "@/characters/Character";
import type { Expression } from "@/characters/types";
import { RichText } from "@/components/ui/RichText";
import type { Exercise } from "@/content/registry";

/** Prompt at the top of an exercise. With a character, it's a speech bubble. */
export function PromptHeader({ exercise, expression }: { exercise: Exercise; expression: Expression }) {
  if (!exercise.characterId || exercise.type === "dialogue") {
    return (
      <h1 className="font-display text-[28px] leading-tight font-semibold text-ink text-balance">
        <RichText text={exercise.prompt} />
      </h1>
    );
  }
  return (
    <div className="flex items-end gap-4">
      <Character
        id={exercise.characterId}
        expression={expression}
        size={112}
        animate
        className="[@media(max-height:840px)]:size-[92px]"
      />
      <div className="relative mb-6 rounded-3xl [@media(max-height:840px)]:mb-4 border-2 border-line bg-surface px-5 py-4 shadow-card">
        {/* bubble tail */}
        <span
          aria-hidden
          className="absolute bottom-4 -left-[9px] size-4 rotate-45 border-b-2 border-l-2 border-line bg-surface"
        />
        <h1 className="relative font-display text-[22px] leading-snug font-semibold text-ink text-balance">
          <RichText text={exercise.prompt} />
        </h1>
      </div>
    </div>
  );
}
