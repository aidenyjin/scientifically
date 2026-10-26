"use client";

import type { Exercise } from "@/content/registry";
import type { CompletionSummary } from "@/engine/summary";
import { LessonPlayer } from "./LessonPlayer";

const fakeSummary = (xp: number): CompletionSummary => ({
  xp: { total: xp, breakdown: [{ label: "Lesson", amount: xp }] },
  gemsEarned: 0,
  gemsBalance: 0,
  hearts: 5,
  streak: { current: 0, extended: false, freezeUsed: false },
  dailyGoal: { xpToday: 0, goal: 20, justReached: false, chestGems: 0 },
  quests: [],
  achievements: [],
});

/** Plays exercises without saving anything (admin preview, /dev routes). */
export function PreviewPlayer({
  exercises,
  title,
  exitHref,
}: {
  exercises: Exercise[];
  title: string;
  exitHref: string;
}) {
  return (
    <LessonPlayer
      packId="preview"
      lessonId="preview"
      title={title}
      mode="standard"
      exercises={exercises}
      hearts={5}
      gems={1000}
      exitHref={exitHref}
      preview
      onComplete={async () => fakeSummary(10)}
      onAbandon={async () => {}}
      onRefillHearts={async () => ({ ok: true, hearts: 5, gems: 650 })}
    />
  );
}
