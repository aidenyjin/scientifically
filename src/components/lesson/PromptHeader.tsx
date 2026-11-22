"use client";

import { RichText } from "@/components/ui/RichText";
import type { Exercise } from "@/content/registry";

/**
 * The question, centred and set in the heading serif. The guide character
 * lives in the footer now (one character per screen), so the prompt is
 * plain type.
 */
export function PromptHeader({ exercise, eyebrow }: { exercise: Exercise; eyebrow?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {eyebrow && (
        <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">{eyebrow}</p>
      )}
      <h1 className="font-heading text-ink max-w-[30ch] text-[34px] leading-[1.15] font-normal tracking-[-0.015em] [@media(max-height:840px)]:text-[28px]">
        <RichText text={exercise.prompt} />
      </h1>
    </div>
  );
}
