"use client";

import { useEffect } from "react";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import type { InfoCard, InfoCardResponse } from "./schema";

export function InfoCardView({ exercise, onChange }: ExerciseProps<InfoCard, InfoCardResponse>) {
  // Always "answered": the player shows Continue straight away.
  useEffect(() => onChange({}), [exercise.id, onChange]);

  return (
    <article className="rounded-3xl border-2 border-line bg-surface p-7 shadow-card">
      <h2 className="font-display text-3xl font-semibold text-ink">{exercise.title}</h2>
      <div className="mt-4 grid gap-3 text-[17px] leading-relaxed text-ink-soft">
        {exercise.body.map((p, i) => (
          <p key={i} className="animate-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
            <RichText text={p} />
          </p>
        ))}
      </div>
      {exercise.keyFact && (
        <div className="mt-6 flex gap-3 rounded-2xl bg-brand-soft p-4 text-[16px] font-semibold text-ink">
          <span aria-hidden className="text-xl leading-none">💡</span>
          <RichText text={exercise.keyFact} />
        </div>
      )}
    </article>
  );
}
