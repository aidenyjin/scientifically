"use client";

import { Timer } from "lucide-react";
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
      <footer className="border-t-2 border-line">
        <div className="mx-auto flex min-h-[120px] w-full max-w-[1040px] items-center justify-between gap-6 px-8">
          <p className="text-sm font-semibold text-wrong">{error}</p>
          {error ? (
            <Button size="lg" variant="danger" className="w-44" onClick={onRetrySave}>
              Try again
            </Button>
          ) : (
            <Button
              size="lg"
              variant="success"
              className="w-44 focus-visible:outline-correct/50"
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
    stats.mode === "practice" ? "Practice complete!" : stats.perfect ? "Perfect lesson!" : "Lesson complete!";
  const line = reactionLine(stats, title);
  return (
    <div className="flex w-full max-w-[640px] flex-col items-center text-center">
      <div className="animate-pop-in">
        <Character id="lumi" expression="celebrate" size={168} animate />
      </div>
      <h1 className="mt-4 animate-rise-in font-display text-4xl font-semibold text-xp-dark [animation-delay:80ms]">
        {title}
      </h1>
      {line && <p className="mt-2 animate-rise-in text-lg font-semibold text-ink-soft [animation-delay:120ms]">“{line}”</p>}
      {preview && <p className="mt-2 text-sm font-semibold text-muted">Preview — nothing was saved.</p>}

      <div className="mt-9 grid w-full grid-cols-3 gap-4">
        <StatTile
          label="Total XP"
          color="var(--xp)"
          labelColor="color-mix(in oklab, var(--xp) 30%, black)"
          icon={<BoltIcon size={22} />}
          value={summary?.xp.total ?? null}
          delay={120}
        />
        <StatTile
          label={stats.perfect ? "Perfect" : "Accuracy"}
          color="var(--correct)"
          icon={<TrophyIcon size={22} />}
          value={Math.round(stats.accuracy * 100)}
          suffix="%"
          delay={180}
        />
        <StatTile
          label="Time"
          color="var(--gem)"
          icon={<Timer className="size-[22px]" strokeWidth={2.75} aria-hidden />}
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
  color,
  labelColor = "white",
  icon,
  value,
  suffix = "",
  text,
  delay,
}: {
  label: string;
  color: string;
  /** Header text colour (white reads poorly on the yellow XP tile). */
  labelColor?: string;
  icon: React.ReactNode;
  value?: number | null;
  suffix?: string;
  text?: string;
  delay: number;
}) {
  const counted = useCountUp(value ?? 0, { duration: 700, delay: delay + 150 });
  return (
    <div
      className="animate-rise-in overflow-hidden rounded-2xl border-2"
      style={{ borderColor: color, background: color, animationDelay: `${delay}ms` }}
    >
      <p className="py-1.5 font-display text-[13px] font-semibold tracking-wider uppercase" style={{ color: labelColor }}>
        {label}
      </p>
      <div className="flex items-center justify-center gap-2 rounded-xl bg-surface py-4 font-display text-2xl font-bold" style={{ color }}>
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
          <FlameIcon size={168} />
        </div>
      </div>
      <p className="mt-1 font-display text-[88px] leading-none font-bold text-streak tabular-nums">{shown}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-streak">day streak!</h1>
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
    <div className="mt-7 flex gap-3 rounded-2xl border-2 border-line bg-surface px-5 py-4">
      {labels.map((l, i) => {
        const daysAgo = today - i;
        const lit = daysAgo >= 0 && daysAgo < current;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-xs font-bold", i === today ? "text-streak" : "text-muted")}>{l}</span>
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full",
                lit ? "bg-streak text-white" : "bg-line",
              )}
            >
              {lit && "✓"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink-soft">
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
