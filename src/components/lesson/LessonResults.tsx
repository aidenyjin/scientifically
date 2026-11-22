"use client";

import { Check, Timer } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Character } from "@/characters/Character";
import { reactionFor } from "@/characters/reactions";
import { BoltIcon, ChestIcon, FlameIcon, GemIcon, TrophyIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useCountUp } from "@/components/ui/useCountUp";
import type { LessonStats } from "@/engine/lesson";
import type { CompletionSummary } from "@/engine/summary";
import { useHotkeys } from "@/lib/keyboard";
import { cn } from "@/lib/cn";
import { fireConfetti } from "./confetti";

type Stage = "results" | "streak";

export function LessonResults({
  stats,
  durationMs,
  summary,
  error,
  preview,
  onRetrySave,
  onDone,
}: {
  stats: LessonStats;
  durationMs: number;
  summary: CompletionSummary | null;
  error: string | null;
  preview?: boolean;
  onRetrySave(): void;
  onDone(): void;
}) {
  const [stage, setStage] = useState<Stage>("results");
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!reduce) fireConfetti(stats.perfect ? "big" : "normal");
  }, [reduce, stats.perfect]);

  const next = () => {
    if (stage === "results" && summary?.streak.extended) setStage("streak");
    else onDone();
  };

  const ready = preview || summary !== null;
  useHotkeys({ Enter: () => ready && next() }, { enabled: ready });

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        {stage === "results" ? (
          <ResultsStage stats={stats} durationMs={durationMs} summary={summary} preview={preview} />
        ) : (
          summary && <StreakStage summary={summary} />
        )}
      </main>
      <footer className="border-line bg-panel border-t">
        <div className="mx-auto flex min-h-[120px] w-full max-w-[1040px] items-center justify-between gap-6 px-8">
          <p className="text-wrong-ink text-sm">{error}</p>
          {error ? (
            <Button size="lg" variant="danger" className="w-44" onClick={onRetrySave}>
              Try again
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-44"
              disabled={!ready}
              onClick={next}
              autoFocus
            >
              {ready ? "Continue" : "Saving…"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function ResultsStage({
  stats,
  durationMs,
  summary,
  preview,
}: {
  stats: LessonStats;
  durationMs: number;
  summary: CompletionSummary | null;
  preview?: boolean;
}) {
  const title =
    stats.mode === "practice" ? "Practice complete" : stats.perfect ? "A perfect lesson" : "Lesson complete";
  const line = reactionLine(stats, title);
  return (
    <div className="flex w-full max-w-[640px] flex-col items-center text-center">
      <div className="animate-pop-in">
        <Character id="lumi" expression="celebrate" size={168} animate />
      </div>
      <h1 className="animate-rise-in font-heading text-ink mt-4 text-[48px] leading-tight font-light tracking-[-0.02em] [animation-delay:80ms]">
        {title}
      </h1>
      {line && (
        <p className="animate-rise-in font-heading text-ink-soft mt-2 text-xl italic [animation-delay:120ms]">“{line}”</p>
      )}
      {preview && <p className="text-muted mt-2 text-sm">Preview — nothing was saved.</p>}

      <div className="mt-10 grid w-full grid-cols-3 gap-3">
        <StatTile
          label="Total XP"
          icon={<BoltIcon size={20} />}
          value={summary?.xp.total ?? null}
          delay={120}
        />
        <StatTile
          label={stats.perfect ? "Perfect" : "Accuracy"}
          icon={<TrophyIcon size={20} />}
          value={Math.round(stats.accuracy * 100)}
          suffix="%"
          delay={180}
        />
        <StatTile
          label="Time"
          icon={<Timer className="text-ink-soft size-5" strokeWidth={1.7} aria-hidden />}
          text={formatDuration(durationMs)}
          delay={240}
        />
      </div>

      {summary && (summary.gemsEarned > 0 || summary.dailyGoal.justReached || summary.achievements.length > 0) && (
        <div className="mt-7 flex animate-rise-in flex-wrap justify-center gap-2 [animation-delay:320ms]">
          {summary.gemsEarned > 0 && (
            <Chip>
              <GemIcon size={18} /> +{summary.gemsEarned} gems
            </Chip>
          )}
          {summary.dailyGoal.justReached && (
            <Chip>
              <ChestIcon size={18} /> Daily goal reached · +{summary.dailyGoal.chestGems}
            </Chip>
          )}
          {summary.achievements.map((a) => (
            <Chip key={`${a.id}-${a.tier}`}>
              <TrophyIcon size={18} /> {a.title}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  icon,
  value,
  suffix = "",
  text,
  delay,
}: {
  label: string;
  icon: React.ReactNode;
  value?: number | null;
  suffix?: string;
  text?: string;
  delay: number;
}) {
  const counted = useCountUp(value ?? 0, { duration: 700, delay: delay + 150 });
  return (
    <div
      className="animate-rise-in border-line bg-surface shadow-card rounded-2xl border px-4 pt-3.5 pb-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">{label}</p>
      <div className="text-ink mt-2 flex items-center justify-center gap-2 font-mono text-[26px]">
        {icon}
        <span className="tabular-nums">
          {text ?? (value === null || value === undefined ? "…" : `${counted}${suffix}`)}
        </span>
      </div>
    </div>
  );
}

function StreakStage({ summary }: { summary: CompletionSummary }) {
  const days = summary.streak.current;
  const shown = useCountUp(days, { from: Math.max(0, days - 1), duration: 500, delay: 350 });
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative animate-pop-in">
        <div className="origin-bottom animate-[flicker_1.8s_ease-in-out_infinite]">
          <FlameIcon size={120} />
        </div>
      </div>
      <p className="font-heading text-ink mt-3 text-[96px] leading-none font-light tabular-nums">{shown}</p>
      <h1 className="font-heading text-streak-dark mt-1 text-[32px]">day streak</h1>
      <p className="mt-3 max-w-sm text-balance text-ink-soft">
        {summary.streak.freezeUsed
          ? "A streak freeze kept your streak safe. Welcome back!"
          : days === 1
            ? "You started a streak. Come back tomorrow to grow it."
            : "Practice every day to keep it burning."}
      </p>
      <WeekDots current={days} />
    </div>
  );
}

function WeekDots({ current }: { current: number }) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = (new Date().getDay() + 6) % 7;
  return (
    <div className="border-line bg-surface shadow-card mt-8 flex gap-3 rounded-2xl border px-5 py-4">
      {labels.map((l, i) => {
        const daysAgo = today - i;
        const lit = daysAgo >= 0 && daysAgo < current;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={cn("font-mono text-[11px]", i === today ? "text-ink" : "text-muted")}>{l}</span>
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full",
                lit ? "bg-streak text-white" : "bg-surface-2",
              )}
            >
              {lit && <Check className="size-4" strokeWidth={2.4} aria-hidden />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-line bg-surface text-ink-soft inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm">
      {children}
    </span>
  );
}

/** Lumi's line under the title, skipping any line that just repeats the title. */
function reactionLine(stats: LessonStats, title: string): string | undefined {
  const event = stats.perfect ? "perfect" : "lessonComplete";
  const seed = stats.firstTryCorrect + stats.total;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  for (let i = 0; i < 4; i++) {
    const { line } = reactionFor(event, "lumi", seed + i);
    if (line && norm(line) !== norm(title)) return line;
  }
  return undefined;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
