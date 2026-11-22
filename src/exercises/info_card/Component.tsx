"use client";

import { useEffect } from "react";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import type { InfoCard, InfoCardResponse } from "./schema";

export function InfoCardView({ exercise, onChange }: ExerciseProps<InfoCard, InfoCardResponse>) {
  // Always "answered": the player shows Continue straight away.
  useEffect(() => onChange({}), [exercise.id, onChange]);

  return (
    <article className="border-line bg-surface shadow-card rounded-3xl border p-8">
      <h2 className="font-heading text-ink text-[32px] leading-tight tracking-[-0.015em]">{exercise.title}</h2>
      <div className="mt-4 grid gap-3 text-[17px] leading-relaxed text-ink-soft">
        {exercise.body.map((p, i) => (
          <p key={i} className="animate-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
            <RichText text={p} />
          </p>
        ))}
      </div>
      {exercise.keyFact && (
        <div className="bg-sage text-ink mt-6 flex gap-3 rounded-2xl p-4 text-[16px]">
          <span aria-hidden className="text-sage-ink mt-0.5 shrink-0 text-[11px] font-medium tracking-[0.16em] uppercase">
            Key fact
          </span>
          <RichText text={exercise.keyFact} />
        </div>
      )}
    </article>
  );
}
